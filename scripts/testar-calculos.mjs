/**
 * Testes das regras financeiras (sem banco).
 *
 *   npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  calcularEmprestimo,
  calcularJuros,
  calcularVencimentosDiarios,
  calcularVencimentosSemanais,
  calcularVencimentoMensal,
  gerarParcelas,
} from '../src/lib/financeiro/emprestimo.ts'
import { ehDomingo, diaDaSemana, hojeBR, somarDias } from '../src/lib/financeiro/datas.ts'
import { formatarMoeda, lerValorDigitado, paraCentavos, paraReais } from '../src/lib/financeiro/dinheiro.ts'
import { cnpjValido, formatarCnpj } from '../src/lib/validacao/cnpj.ts'
import { cpfValido, documentoValido, formatarDocumento, tipoDocumento } from '../src/lib/validacao/documento.ts'

test('diário do prompt: R$ 1.000 a 35% = 24 x R$ 56,25', () => {
  const c = calcularEmprestimo(100000, 'DIARIO', 35, '2026-04-06')
  assert.equal(c.juros, 35000)
  assert.equal(c.total, 135000)
  assert.equal(c.quantidade, 24)
  assert.equal(c.valorParcelaBase, 5625)
  assert.ok(c.parcelas.every((p) => p.valor === 5625))
})

test('semanal do prompt: R$ 1.000 a 40% = 4 x R$ 350', () => {
  const c = calcularEmprestimo(100000, 'SEMANAL', 40, '2026-09-30')
  assert.equal(c.total, 140000)
  assert.deepEqual(c.parcelas.map((p) => p.valor), [35000, 35000, 35000, 35000])
  assert.deepEqual(c.parcelas.map((p) => p.vencimento), ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28'])
  assert.ok(c.parcelas.every((p) => diaDaSemana(p.vencimento) === diaDaSemana('2026-09-30')))
})

test('mensal do prompt: 01/10 vence 31/10, 1 parcela de R$ 1.500', () => {
  const c = calcularEmprestimo(100000, 'MENSAL', 50, '2026-10-01')
  assert.equal(c.parcelas.length, 1)
  assert.equal(c.parcelas[0].vencimento, '2026-10-31')
  assert.equal(c.parcelas[0].valor, 150000)
  assert.equal(calcularVencimentoMensal('2026-10-01'), '2026-10-31')
})

test('diário: primeira no dia seguinte, 24 datas, nenhuma no domingo', () => {
  // 2026-09-28 é segunda-feira.
  const datas = calcularVencimentosDiarios('2026-09-28')
  assert.equal(datas.length, 24)
  assert.equal(datas[0], '2026-09-29')
  assert.ok(datas.every((d) => !ehDomingo(d)))
  assert.equal(new Set(datas).size, 24)
  // 29/09 (ter) .. 03/10 (sáb) = 5 dias; 04/10 é domingo; volta em 05/10.
  assert.equal(datas[4], '2026-10-03')
  assert.equal(datas[5], '2026-10-05')
})

test('diário: empréstimo no sábado pula o domingo logo de cara', () => {
  const datas = calcularVencimentosDiarios('2026-10-03')
  assert.equal(datas[0], '2026-10-05')
})

test('diário: 24 dias úteis cobrem 4 semanas (28 dias corridos)', () => {
  for (let i = 0; i < 7; i++) {
    const d = somarDias('2026-01-05', i)
    const datas = calcularVencimentosDiarios(d)
    assert.equal(datas.length, 24)
    assert.ok(datas.every((x) => !ehDomingo(x)), d)
  }
})

test('arredondamento: soma das parcelas sempre fecha no total', () => {
  for (const principal of [1000, 1001, 1013, 2399, 33333, 100000, 123457, 999999, 5000033]) {
    for (const limiar of [0, 1, 12.5, 33.33, 35, 40, 50, 99.99]) {
      for (const modalidade of ['DIARIO', 'SEMANAL', 'MENSAL']) {
        const c = calcularEmprestimo(principal, modalidade, limiar, '2026-03-10')
        const soma = c.parcelas.reduce((s, p) => s + p.valor, 0)
        assert.equal(soma, c.total, `${principal} ${limiar} ${modalidade}`)
        assert.ok(c.parcelas.every((p) => p.valor > 0), `${principal} ${limiar} ${modalidade}`)
      }
    }
  }
})

test('arredondamento: sobra vai para a última parcela', () => {
  const parcelas = gerarParcelas(100000, Array(24).fill('2026-01-01'))
  // 1000,00 / 24 = 41,666… → 41,67 x 23 = 958,41 → última 41,59
  assert.equal(parcelas[0].valor, 4167)
  assert.equal(parcelas[23].valor, 100000 - 4167 * 23)
})

test('juros com limiar decimal arredonda meio centavo para cima', () => {
  assert.equal(calcularJuros(1, 50), 1) // 0,005 → 0,01
  assert.equal(calcularJuros(333, 33.33), 111) // 1,109889 → 1,11
  assert.equal(calcularJuros(100000, 0), 0)
})

test('semanal: 4 datas de 7 em 7 dias', () => {
  assert.deepEqual(calcularVencimentosSemanais('2026-12-30'), ['2027-01-06', '2027-01-13', '2027-01-20', '2027-01-27'])
})

test('dinheiro: leitura e formatação pt-BR', () => {
  assert.equal(lerValorDigitado('1.000,50'), 100050)
  assert.equal(lerValorDigitado('1000,5'), 100050)
  assert.equal(lerValorDigitado('R$ 56,25'), 5625)
  assert.equal(lerValorDigitado('56'), 5600)
  assert.equal(lerValorDigitado('1,2,3'), null)
  assert.equal(lerValorDigitado('abc'), null)
  assert.equal(formatarMoeda(100000), 'R$ 1.000,00')
  assert.equal(paraReais(5625), '56.25')
  assert.equal(paraReais(5), '0.05')
  assert.equal(paraCentavos('9056.25'), 905625)
  assert.equal(paraCentavos(0.29), 29)
})

test('datas: hoje em Brasília, não em UTC', () => {
  // 02:30 UTC de 30/09 ainda é 29/09 em Brasília.
  assert.equal(hojeBR(new Date('2026-09-30T02:30:00Z')), '2026-09-29')
  assert.equal(hojeBR(new Date('2026-09-30T03:30:00Z')), '2026-09-30')
})

test('CNPJ numérico e alfanumérico', () => {
  assert.ok(cnpjValido('11.222.333/0001-81'))
  assert.ok(cnpjValido('11222333000181'))
  assert.ok(!cnpjValido('11.222.333/0001-80'))
  assert.ok(!cnpjValido('00000000000000'))
  assert.ok(!cnpjValido('123'))
  // Exemplo oficial da Receita para o CNPJ alfanumérico.
  assert.ok(cnpjValido('12.ABC.345/01DE-35'))
  assert.equal(formatarCnpj('11222333000181'), '11.222.333/0001-81')
  assert.equal(formatarCnpj('12abc34501de35'), '12.ABC.345/01DE-35')
})

test('documento do cliente: CPF ou CNPJ', () => {
  assert.ok(cpfValido('529.982.247-25'))
  assert.ok(cpfValido('52998224725'))
  assert.ok(!cpfValido('529.982.247-24'))
  assert.ok(!cpfValido('11111111111'))
  assert.ok(documentoValido('529.982.247-25'))
  assert.ok(documentoValido('11.222.333/0001-81'))
  assert.ok(documentoValido('12.ABC.345/01DE-35'))
  assert.ok(!documentoValido('123456789'))
  assert.equal(tipoDocumento('52998224725'), 'CPF')
  assert.equal(tipoDocumento('11222333000181'), 'CNPJ')
  assert.equal(tipoDocumento('1234'), null)
  // A máscara acompanha a digitação: CPF até 11 dígitos, depois vira CNPJ.
  assert.equal(formatarDocumento('5299822'), '529.982.2')
  assert.equal(formatarDocumento('52998224725'), '529.982.247-25')
  assert.equal(formatarDocumento('112223330001'), '11.222.333/0001')
  assert.equal(formatarDocumento('11222333000181'), '11.222.333/0001-81')
  assert.equal(formatarDocumento('12abc'), '12.ABC')
})
