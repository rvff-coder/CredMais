import 'server-only'

import { revalidatePath } from 'next/cache'

import { EMPRESTIMO_MINIMO, VALOR_MAXIMO, type Centavos } from '@/lib/financeiro/dinheiro'
import { ehDataISO, hojeBR, type DataISO } from '@/lib/financeiro/datas'

/*
 * Validação do lado do servidor. As server actions são endpoints públicos:
 * tudo que chega delas é tratado como não confiável, mesmo que a tela já
 * tenha validado.
 */

export const SESSAO_EXPIRADA = 'Sua sessão expirou. Entre novamente.'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function ehUuid(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID.test(valor)
}

export function validarCentavos(valor: unknown, minimo: Centavos = 1): valor is Centavos {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= minimo && valor <= VALOR_MAXIMO
}

export function validarValorEmprestimo(valor: unknown): string | null {
  if (!validarCentavos(valor)) return 'Informe um valor maior que zero.'
  if (valor < EMPRESTIMO_MINIMO) return 'O valor mínimo de um empréstimo é R$ 10,00.'
  return null
}

/** Data da operação: válida e não futura. */
export function validarDataOperacao(valor: unknown): valor is DataISO {
  return ehDataISO(valor) && valor <= hojeBR() && valor >= '2000-01-01'
}

export function texto(valor: unknown, max: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : ''
}

/** Depois de qualquer escrita: dados de carteira aparecem em várias telas. */
export function atualizarTelas() {
  revalidatePath('/', 'layout')
}
