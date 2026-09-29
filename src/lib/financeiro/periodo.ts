import { hojeBR, somarDias, somarMeses, type DataISO } from './datas.ts'

export type Periodo = '7d' | '30d' | '90d' | '12m'

export const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' },
  { valor: '90d', rotulo: '90 dias' },
  { valor: '12m', rotulo: '12 meses' },
]

export function lerPeriodo(valor: unknown, padrao: Periodo = '30d'): Periodo {
  return PERIODOS.some((p) => p.valor === valor) ? (valor as Periodo) : padrao
}

/** Intervalo fechado que termina hoje. 12 meses agrupa por mês. */
export function intervaloDoPeriodo(periodo: Periodo, hoje: DataISO = hojeBR()) {
  switch (periodo) {
    case '7d':
      return { inicio: somarDias(hoje, -6), fim: hoje, agrupar: 'dia' as const }
    case '30d':
      return { inicio: somarDias(hoje, -29), fim: hoje, agrupar: 'dia' as const }
    case '90d':
      return { inicio: somarDias(hoje, -89), fim: hoje, agrupar: 'dia' as const }
    case '12m':
      return { inicio: somarMeses(hoje, -11), fim: hoje, agrupar: 'mes' as const }
  }
}
