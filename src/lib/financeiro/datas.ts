/**
 * Datas de calendário como strings ISO (AAAA-MM-DD).
 *
 * Vencimento é um dia, não um instante. Guardar como Date traria o fuso junto
 * e, às 22h em Brasília, "hoje" já seria amanhã em UTC. As contas aqui usam
 * UTC só como calendário neutro: nenhuma delas depende do relógio local.
 */

export type DataISO = string

export const FUSO = 'America/Sao_Paulo'

const NOMES_DIA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const NOMES_DIA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const NOMES_MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function paraUTC(data: DataISO): Date {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

function deUTC(data: Date): DataISO {
  return data.toISOString().slice(0, 10)
}

export function ehDataISO(texto: unknown): texto is DataISO {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  return deUTC(paraUTC(texto)) === texto
}

/** O dia de hoje em Brasília. */
export function hojeBR(agora: Date = new Date()): DataISO {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(agora)
}

export function somarDias(data: DataISO, dias: number): DataISO {
  const d = paraUTC(data)
  d.setUTCDate(d.getUTCDate() + dias)
  return deUTC(d)
}

export function somarMeses(data: DataISO, meses: number): DataISO {
  const d = paraUTC(data)
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + meses)
  return deUTC(d)
}

/** 0 = domingo ... 6 = sábado */
export function diaDaSemana(data: DataISO): number {
  return paraUTC(data).getUTCDay()
}

export function ehDomingo(data: DataISO): boolean {
  return diaDaSemana(data) === 0
}

export function diasEntre(de: DataISO, ate: DataISO): number {
  return Math.round((paraUTC(ate).getTime() - paraUTC(de).getTime()) / 86_400_000)
}

/** 22/04/2026 */
export function formatarData(data: DataISO | null | undefined): string {
  if (!data) return '—'
  const [a, m, d] = data.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** 22/04 */
export function formatarDataCurta(data: DataISO): string {
  const [, m, d] = data.slice(0, 10).split('-')
  return `${d}/${m}`
}

export function nomeDiaSemana(data: DataISO, curto = false): string {
  return (curto ? NOMES_DIA_CURTO : NOMES_DIA)[diaDaSemana(data)]
}

export function nomeMesCurto(data: DataISO): string {
  return NOMES_MES_CURTO[Number(data.slice(5, 7)) - 1]
}

/** Instante (timestamptz do banco) no dia de Brasília. */
export function diaDoInstante(instante: string | Date): DataISO {
  return hojeBR(typeof instante === 'string' ? new Date(instante) : instante)
}

/** 14:32, no horário de Brasília. */
export function formatarHora(instante: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof instante === 'string' ? new Date(instante) : instante)
}

/** 10/04/2026 às 14:32 */
export function formatarDataHora(instante: string | Date | null | undefined): string {
  if (!instante) return '—'
  return `${formatarData(diaDoInstante(instante))} às ${formatarHora(instante)}`
}
