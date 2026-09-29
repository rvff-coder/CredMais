/**
 * Teste das funções financeiras do banco, de ponta a ponta.
 *
 *   npm run test:sql
 *
 * Roda tudo dentro de UMA transação e desfaz no final (ROLLBACK): nenhum
 * dado fica gravado. Cria um usuário temporário, simula a sessão dele e
 * percorre o ciclo inteiro: adicionar valor, emprestar, receber, acertar,
 * finalizar. Também confere que o cálculo do banco é idêntico ao do app.
 */

import assert from 'node:assert/strict'
import pg from 'pg'

import { calcularEmprestimo } from '../src/lib/financeiro/emprestimo.ts'
import { hojeBR, somarDias } from '../src/lib/financeiro/datas.ts'

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('Falta SUPABASE_DB_URL no .env.local.')
  process.exit(1)
}

const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await db.connect()

let passou = 0
async function caso(nome, fn) {
  await db.query('savepoint caso')
  try {
    await fn()
    await db.query('release savepoint caso')
    passou++
    console.log(`  ok   ${nome}`)
  } catch (e) {
    await db.query('rollback to savepoint caso')
    console.error(`  FALHOU ${nome}\n       ${e.message}`)
    process.exitCode = 1
  }
}

async function esperarErro(sql, params, codigo) {
  await db.query('savepoint erro')
  try {
    await db.query(sql, params)
  } catch (e) {
    await db.query('rollback to savepoint erro')
    assert.equal(e.message, codigo)
    return
  }
  await db.query('release savepoint erro')
  assert.fail(`esperava ${codigo}`)
}

const um = async (sql, params) => (await db.query(sql, params)).rows[0]
const saldo = async () => Number((await um('select saldo_carteira() as s')).s)
const centavos = (v) => Math.round(Number(v) * 100)

try {
  await db.query('begin')

  // Usuário de teste e sessão simulada como no PostgREST.
  const uid = (await um('select gen_random_uuid() as id')).id
  await db.query(
    `insert into auth.users (id, email, aud, role, raw_user_meta_data)
     values ($1, 'teste-sql@credmais.local', 'authenticated', 'authenticated', '{"nome":"Teste SQL"}')`,
    [uid],
  )
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })])
  await db.query('set local role authenticated')

  const saldoInicial = await saldo()
  const hoje = hojeBR()

  console.log('\nCálculo: banco x app')

  await caso('vencimentos idênticos para 60 datas x 3 modalidades', async () => {
    for (let i = 0; i < 60; i++) {
      const data = somarDias('2026-01-01', i * 5)
      for (const m of ['DIARIO', 'SEMANAL', 'MENSAL']) {
        const { rows } = await db.query('select vencimento::text as v from calcular_vencimentos($1, $2) order by numero', [m, data])
        const app = calcularEmprestimo(100000, m, 35, data).parcelas.map((p) => p.vencimento)
        assert.deepEqual(rows.map((r) => r.v), app, `${m} ${data}`)
      }
    }
  })

  console.log('\nCarteira')

  await caso('adicionar valor entra no saldo e gera evento', async () => {
    await db.query(`select adicionar_valor(10000, $1, 'aporte teste')`, [hoje])
    assert.equal(await saldo(), saldoInicial + 10000)
    const ev = await um(`select count(*)::int as n from eventos where tipo_evento = 'VALOR_ADICIONADO' and usuario_id = $1`, [uid])
    assert.equal(ev.n, 1)
  })

  await caso('valores inválidos são recusados', async () => {
    await esperarErro(`select adicionar_valor(0, $1, '')`, [hoje], 'VALOR_INVALIDO')
    await esperarErro(`select adicionar_valor(-5, $1, '')`, [hoje], 'VALOR_INVALIDO')
    await esperarErro(`select adicionar_valor(1.005, $1, '')`, [hoje], 'VALOR_INVALIDO')
    await esperarErro(`select adicionar_valor(10, $1, '')`, [somarDias(hoje, 1)], 'DATA_INVALIDA')
  })

  await caso('livro-caixa não pode ser editado nem apagado', async () => {
    await esperarErro(`update movimentacoes set valor = 1`, [], 'permission denied for table movimentacoes')
    await db.query('reset role')
    await esperarErro(`delete from movimentacoes`, [], 'MOVIMENTACAO_IMUTAVEL')
    await db.query('set local role authenticated')
  })

  console.log('\nEmpréstimo')

  const cliente = (await um(`insert into clientes (nome, cnpj) values ('Cliente Teste', '11222333000181') returning id`)).id

  await caso('CNPJ inválido é recusado pelo banco', async () => {
    await db.query('savepoint c')
    await assert.rejects(db.query(`insert into clientes (nome, cnpj) values ('X', '11222333000180')`))
    await db.query('rollback to savepoint c')
  })

  await caso('cadastro de cliente gera evento CLIENTE_CRIADO', async () => {
    const r = await um(`select count(*)::int as n from eventos where cliente_id = $1 and tipo_evento = 'CLIENTE_CRIADO'`, [cliente])
    assert.equal(r.n, 1)
  })

  let emprestimo
  await caso('diário R$ 1.000 a 35%: 24 x 56,25, principal sai da carteira', async () => {
    const antes = await saldo()
    emprestimo = (await um(`select criar_emprestimo($1, 1000, 'DIARIO', $2, '', 35) as id`, [cliente, hoje])).id
    const e = await um('select * from emprestimos where id = $1', [emprestimo])
    assert.equal(Number(e.percentual_limiar), 35)
    assert.equal(Number(e.valor_juros), 350)
    assert.equal(Number(e.valor_total), 1350)
    assert.equal(e.quantidade_parcelas, 24)
    const { rows } = await db.query('select valor, data_vencimento::text as v from parcelas where emprestimo_id = $1 order by numero_parcela', [emprestimo])
    assert.equal(rows.length, 24)
    assert.ok(rows.every((p) => Number(p.valor) === 56.25))
    assert.ok(rows.every((p) => new Date(`${p.v}T12:00:00Z`).getUTCDay() !== 0), 'nenhum domingo')
    assert.equal(await saldo(), antes - 1000)
  })

  await caso('arredondamento: soma fecha no total e bate com o app', async () => {
    for (const [valor, m] of [[1000.01, 'DIARIO'], [333.33, 'SEMANAL'], [77.77, 'DIARIO'], [10, 'DIARIO'], [999.99, 'MENSAL']]) {
      const id = (await um(`select criar_emprestimo($1, $2, $3, $4, '', null) as id`, [cliente, valor, m, hoje])).id
      const e = await um('select valor_total, percentual_limiar from emprestimos where id = $1', [id])
      const { rows } = await db.query('select valor from parcelas where emprestimo_id = $1 order by numero_parcela', [id])
      const soma = rows.reduce((s, p) => s + centavos(p.valor), 0)
      assert.equal(soma, centavos(e.valor_total), `${valor} ${m}`)
      const app = calcularEmprestimo(centavos(valor), m, Number(e.percentual_limiar), hoje)
      assert.deepEqual(rows.map((p) => centavos(p.valor)), app.parcelas.map((p) => p.valor), `${valor} ${m}`)
    }
  })

  await caso('saldo insuficiente é recusado', async () => {
    await esperarErro(`select criar_emprestimo($1, 99999999, 'MENSAL', $2, '', null)`, [cliente, hoje], 'SALDO_INSUFICIENTE')
  })

  await caso('proteções: mínimo, sem cliente, sem modalidade, limiar divergente', async () => {
    await esperarErro(`select criar_emprestimo($1, 9.99, 'DIARIO', $2, '', null)`, [cliente, hoje], 'VALOR_MINIMO_EMPRESTIMO')
    await esperarErro(`select criar_emprestimo(gen_random_uuid(), 100, 'DIARIO', $1, '', null)`, [hoje], 'CLIENTE_NAO_ENCONTRADO')
    await esperarErro(`select criar_emprestimo($1, 100, null, $2, '', null)`, [cliente, hoje], 'MODALIDADE_INVALIDA')
    await esperarErro(`select criar_emprestimo($1, 100, 'DIARIO', $2, '', 30)`, [cliente, hoje], 'LIMIAR_ALTERADO')
  })

  console.log('\nRecebimento')

  await caso('parcela futura aguarda vencimento', async () => {
    const p = await um('select id from parcelas where emprestimo_id = $1 and numero_parcela = 1', [emprestimo])
    await esperarErro('select registrar_pagamento($1)', [p.id], 'AGUARDANDO_VENCIMENTO')
  })

  // Empréstimo retroativo: todas as parcelas já venceram.
  const retro = somarDias(hoje, -40)
  let empRetro
  await caso('empréstimo retroativo nasce com parcelas em atraso e eventos', async () => {
    empRetro = (await um(`select criar_emprestimo($1, 100, 'SEMANAL', $2, '', null) as id`, [cliente, retro])).id
    const r = await um(`select count(*) filter (where status = 'EM_ATRASO')::int as atraso from parcelas where emprestimo_id = $1`, [empRetro])
    assert.equal(r.atraso, 4)
    const ev = await um(`select count(*)::int as n from eventos where emprestimo_id = $1 and tipo_evento = 'PARCELA_EM_ATRASO'`, [empRetro])
    assert.equal(ev.n, 4)
    await db.query('select atualizar_atrasos()')
    const ev2 = await um(`select count(*)::int as n from eventos where emprestimo_id = $1 and tipo_evento = 'PARCELA_EM_ATRASO'`, [empRetro])
    assert.equal(ev2.n, 4, 'rodar de novo não duplica eventos')
  })

  await caso('ordem obrigatória, recebimento soma na carteira, duplicidade barrada', async () => {
    const { rows: ps } = await db.query('select id, valor from parcelas where emprestimo_id = $1 order by numero_parcela', [empRetro])
    await esperarErro('select registrar_pagamento($1)', [ps[1].id], 'PARCELA_FORA_DE_ORDEM')

    const antes = await saldo()
    const r = await um('select registrar_pagamento($1) as r', [ps[0].id])
    assert.equal(r.r.finalizado, false)
    assert.equal(r.r.proxima_numero, 2)
    assert.equal(await saldo(), antes + Number(ps[0].valor))

    await esperarErro('select registrar_pagamento($1)', [ps[0].id], 'PARCELA_JA_PAGA')
    assert.equal(await saldo(), antes + Number(ps[0].valor), 'saldo não muda na segunda tentativa')

    const mov = await um(`select count(*)::int as n from movimentacoes where parcela_id = $1`, [ps[0].id])
    assert.equal(mov.n, 1)
  })

  await caso('última parcela finaliza o empréstimo com evento', async () => {
    const { rows: ps } = await db.query(`select id from parcelas where emprestimo_id = $1 and status <> 'PAGO' order by numero_parcela`, [empRetro])
    let ultimo
    for (const p of ps) ultimo = (await um('select registrar_pagamento($1) as r', [p.id])).r
    assert.equal(ultimo.finalizado, true)
    const e = await um('select status from emprestimos where id = $1', [empRetro])
    assert.equal(e.status, 'FINALIZADO')
    const ev = await um(`select count(*)::int as n from eventos where emprestimo_id = $1 and tipo_evento = 'EMPRESTIMO_FINALIZADO'`, [empRetro])
    assert.equal(ev.n, 1)
    const pago = await um(`select sum(valor) as s from movimentacoes where emprestimo_id = $1 and categoria = 'RECEBIMENTO_DE_PARCELA'`, [empRetro])
    assert.equal(Number(pago.s), 140, 'recebeu principal + juros de 40%')
  })

  console.log('\nAcerto e regras')

  await caso('acerto sai da carteira e não toca em parcelas', async () => {
    const antes = await saldo()
    const pend = await um(`select count(*)::int as n from parcelas where status <> 'PAGO'`)
    await db.query(`select fazer_acerto($1, 200, $2, 'acerto teste')`, [cliente, hoje])
    assert.equal(await saldo(), antes - 200)
    const depois = await um(`select count(*)::int as n from parcelas where status <> 'PAGO'`)
    assert.equal(depois.n, pend.n)
    await esperarErro(`select fazer_acerto($1, 0, $2, '')`, [cliente, hoje], 'VALOR_INVALIDO')
  })

  await caso('mudar limiar não recalcula empréstimos antigos e gera histórico', async () => {
    await db.query('select atualizar_limiares(30, 35, 45)')
    const e = await um('select percentual_limiar, valor_juros from emprestimos where id = $1', [emprestimo])
    assert.equal(Number(e.percentual_limiar), 35)
    assert.equal(Number(e.valor_juros), 350)
    const novo = (await um(`select criar_emprestimo($1, 1000, 'DIARIO', $2, '', 30) as id`, [cliente, hoje])).id
    const n = await um('select percentual_limiar, valor_total from emprestimos where id = $1', [novo])
    assert.equal(Number(n.percentual_limiar), 30)
    assert.equal(Number(n.valor_total), 1300)
    const h = await um(`select count(*)::int as n from historico_regras where usuario_id = $1`, [uid])
    assert.equal(h.n, 3)
    await esperarErro('select atualizar_limiares(-1, 35, 45)', [], 'PERCENTUAL_INVALIDO')
    await esperarErro(`update configuracoes set limiar_diario = 1`, [], 'permission denied for table configuracoes')
  })

  await caso('saldo = entradas - saídas (livro-caixa fecha)', async () => {
    const r = await um(`select
        coalesce(sum(valor) filter (where tipo = 'ENTRADA'), 0) as e,
        coalesce(sum(valor) filter (where tipo = 'SAIDA'), 0) as s
      from movimentacoes`)
    assert.equal(centavos(await saldo()), centavos(r.e) - centavos(r.s))
  })

  await caso('sem sessão, nenhuma função financeira roda', async () => {
    await db.query(`select set_config('request.jwt.claims', '', true)`)
    await esperarErro(`select adicionar_valor(10, $1, '')`, [hoje], 'NAO_AUTENTICADO')
    await db.query('reset role')
    await db.query('set local role anon')
    await esperarErro(`select adicionar_valor(10, $1, '')`, [hoje], 'permission denied for function adicionar_valor')
  })
} finally {
  await db.query('rollback').catch(() => {})
  await db.end()
}

console.log(`\n${passou} caso(s) ok${process.exitCode ? ', com falhas acima' : ''}. Tudo desfeito (rollback).`)
