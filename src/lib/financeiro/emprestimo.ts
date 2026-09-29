/**
 * Regras de cálculo do empréstimo. Fonte única para a prévia na tela.
 *
 * A gravação é refeita pelo banco (criar_emprestimo, em
 * supabase/migrations/0001_estrutura.sql) a partir do limiar vigente lá.
 * scripts/testar-sql.mjs confere que os dois cálculos dão o mesmo resultado.
 *
 *   JUROS   = VALOR × LIMIAR
 *   TOTAL   = VALOR + JUROS
 *   PARCELA = TOTAL / QUANTIDADE  (a última absorve a sobra de centavos)
 */

import { dividirArredondando, type Centavos } from './dinheiro.ts'
import { ehDomingo, somarDias, type DataISO } from './datas.ts'

export type Modalidade = 'DIARIO' | 'SEMANAL' | 'MENSAL'

export const MODALIDADES: Modalidade[] = ['DIARIO', 'SEMANAL', 'MENSAL']

export const NOME_MODALIDADE: Record<Modalidade, string> = {
  DIARIO: 'Diário',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
}

export const QUANTIDADE_PARCELAS: Record<Modalidade, number> = {
  DIARIO: 24,
  SEMANAL: 4,
  MENSAL: 1,
}

export const DESCRICAO_MODALIDADE: Record<Modalidade, string> = {
  DIARIO: '24 parcelas, uma por dia, sem domingos',
  SEMANAL: '4 parcelas, no mesmo dia da semana',
  MENSAL: '1 parcela, 30 dias depois',
}

export type Limiares = Record<Modalidade, number>

export type ParcelaCalculada = {
  numero: number
  valor: Centavos
  vencimento: DataISO
}

export type CalculoEmprestimo = {
  modalidade: Modalidade
  principal: Centavos
  limiar: number
  juros: Centavos
  total: Centavos
  quantidade: number
  valorParcelaBase: Centavos
  parcelas: ParcelaCalculada[]
}

export function ehModalidade(valor: unknown): valor is Modalidade {
  return typeof valor === 'string' && (MODALIDADES as string[]).includes(valor)
}

/**
 * Limiar em percentual (35 = 35%), com até duas casas. Trabalhar com
 * centésimos de ponto percentual mantém a conta em inteiros.
 */
export function calcularJuros(principal: Centavos, limiar: number): Centavos {
  const limiarCentesimos = Math.round(limiar * 100)
  return dividirArredondando(principal * limiarCentesimos, 10_000)
}

/** Uma parcela por dia a partir do dia seguinte, pulando domingos. */
export function calcularVencimentosDiarios(data: DataISO, quantidade = QUANTIDADE_PARCELAS.DIARIO): DataISO[] {
  const datas: DataISO[] = []
  let dia = data
  while (datas.length < quantidade) {
    dia = somarDias(dia, 1)
    if (!ehDomingo(dia)) datas.push(dia)
  }
  return datas
}

/** D+7, D+14, D+21, D+28: sempre o mesmo dia da semana do empréstimo. */
export function calcularVencimentosSemanais(data: DataISO, quantidade = QUANTIDADE_PARCELAS.SEMANAL): DataISO[] {
  return Array.from({ length: quantidade }, (_, i) => somarDias(data, 7 * (i + 1)))
}

/** D+30. */
export function calcularVencimentoMensal(data: DataISO): DataISO {
  return somarDias(data, 30)
}

export function calcularVencimentos(modalidade: Modalidade, data: DataISO): DataISO[] {
  switch (modalidade) {
    case 'DIARIO':
      return calcularVencimentosDiarios(data)
    case 'SEMANAL':
      return calcularVencimentosSemanais(data)
    case 'MENSAL':
      return [calcularVencimentoMensal(data)]
  }
}

/**
 * Divide o total em parcelas iguais arredondadas ao centavo. A diferença do
 * arredondamento vai para a última, então a soma fecha exatamente no total.
 */
export function gerarParcelas(total: Centavos, vencimentos: DataISO[]): ParcelaCalculada[] {
  const quantidade = vencimentos.length
  const base = dividirArredondando(total, quantidade)
  const ultima = total - base * (quantidade - 1)

  return vencimentos.map((vencimento, i) => ({
    numero: i + 1,
    valor: i === quantidade - 1 ? ultima : base,
    vencimento,
  }))
}

export function calcularEmprestimo(
  principal: Centavos,
  modalidade: Modalidade,
  limiar: number,
  data: DataISO,
): CalculoEmprestimo {
  const juros = calcularJuros(principal, limiar)
  const total = principal + juros
  const vencimentos = calcularVencimentos(modalidade, data)
  const parcelas = gerarParcelas(total, vencimentos)

  return {
    modalidade,
    principal,
    limiar,
    juros,
    total,
    quantidade: parcelas.length,
    valorParcelaBase: parcelas[0].valor,
    parcelas,
  }
}

/** "35%" / "32,5%" */
export function formatarPercentual(valor: number | string): string {
  const n = typeof valor === 'string' ? Number(valor) : valor
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}
