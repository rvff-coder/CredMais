/**
 * CNPJ numérico e alfanumérico (Receita Federal, a partir de jul/2026).
 *
 * Formato: 12 posições [0-9A-Z] + 2 dígitos verificadores. O valor de cada
 * caractere é o código ASCII menos 48, o que deixa o cálculo idêntico ao do
 * CNPJ só com números. O banco repete a mesma regra em cnpj_valido().
 */

const PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

/** Tira pontuação e espaços; deixa em maiúsculas. */
export function normalizarCnpj(texto: string): string {
  return texto.toUpperCase().replace(/[^0-9A-Z]/g, '')
}

function digito(base: string, pesos: number[]): number {
  let soma = 0
  for (let i = 0; i < pesos.length; i++) {
    soma += (base.charCodeAt(i) - 48) * pesos[i]
  }
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cnpjValido(texto: string): boolean {
  const cnpj = normalizarCnpj(texto)
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj)) return false
  if (/^(.)\1{13}$/.test(cnpj)) return false

  const dv1 = digito(cnpj, PESOS_1)
  const dv2 = digito(cnpj, PESOS_2)
  return dv1 === Number(cnpj[12]) && dv2 === Number(cnpj[13])
}

/** 12.345.678/0001-95 — aceita entrada parcial, para formatar enquanto digita. */
export function formatarCnpj(texto: string): string {
  const c = normalizarCnpj(texto).slice(0, 14)
  if (c.length <= 2) return c
  if (c.length <= 5) return `${c.slice(0, 2)}.${c.slice(2)}`
  if (c.length <= 8) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`
  if (c.length <= 12) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
}
