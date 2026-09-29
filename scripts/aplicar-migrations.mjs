/**
 * Aplica as migrations de supabase/migrations/ no banco apontado por
 * SUPABASE_DB_URL, em ordem de nome de arquivo.
 *
 *   npm run db:push
 *
 * Cada arquivo roda dentro de uma transação: ou entra inteiro, ou não entra.
 * O que já foi aplicado fica registrado em public.migrations_aplicadas, então
 * rodar de novo é seguro.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import pg from 'pg'

const PASTA = join(import.meta.dirname, '..', 'supabase', 'migrations')

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('Falta SUPABASE_DB_URL. Rode com: npm run db:push')
  process.exit(1)
}

const cliente = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
})

/** Mostra a linha exata do erro, que o Postgres devolve só como offset. */
function localizar(sql, posicao) {
  if (!posicao) return null
  const antes = sql.slice(0, Number(posicao) - 1)
  const linha = antes.split('\n').length
  const trecho = sql.split('\n')[linha - 1] ?? ''
  return { linha, trecho: trecho.trim() }
}

try {
  await cliente.connect()
  console.log('Conectado.\n')

  await cliente.query(`
    create table if not exists migrations_aplicadas (
      arquivo     text primary key,
      aplicada_em timestamptz not null default now()
    )
  `)

  const { rows } = await cliente.query('select arquivo from migrations_aplicadas')
  const jaAplicadas = new Set(rows.map((r) => r.arquivo))

  const arquivos = (await readdir(PASTA)).filter((f) => f.endsWith('.sql')).sort()

  let aplicadas = 0

  for (const arquivo of arquivos) {
    if (jaAplicadas.has(arquivo)) {
      console.log(`  pulada   ${arquivo}`)
      continue
    }

    const sql = await readFile(join(PASTA, arquivo), 'utf8')

    try {
      await cliente.query('begin')
      await cliente.query(sql)
      await cliente.query(
        'insert into migrations_aplicadas (arquivo) values ($1)',
        [arquivo],
      )
      await cliente.query('commit')
      console.log(`  aplicada ${arquivo}`)
      aplicadas++
    } catch (erro) {
      await cliente.query('rollback')
      const onde = localizar(sql, erro.position)
      console.error(`\nFALHOU em ${arquivo}`)
      console.error(`  ${erro.message}`)
      if (erro.detail) console.error(`  detalhe: ${erro.detail}`)
      if (erro.hint) console.error(`  dica: ${erro.hint}`)
      if (onde) console.error(`  linha ${onde.linha}: ${onde.trecho}`)
      console.error('\nNada foi gravado — a transação voltou atrás.')
      process.exitCode = 1
      break
    }
  }

  if (process.exitCode !== 1) {
    console.log(`\n${aplicadas} migration(s) aplicada(s).`)
  }
} catch (erro) {
  console.error('Erro de conexão:', erro.message)
  if (erro.code === 'ENOTFOUND' || erro.code === 'ETIMEDOUT' || erro.code === 'ENETUNREACH') {
    console.error(
      '\nO host não respondeu. A conexão direta do Supabase é IPv6 no plano\n' +
      'gratuito. Use a string do Session pooler (aws-0-<regiao>.pooler.supabase.com).',
    )
  }
  process.exitCode = 1
} finally {
  await cliente.end().catch(() => {})
}
