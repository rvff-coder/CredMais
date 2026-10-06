/**
 * Documento do cliente: CPF (11 dígitos) ou CNPJ (14 posições, numérico ou
 * alfanumérico). Fica gravado sem pontuação na coluna clientes.cnpj. O banco
 * repete a mesma regra em documento_valido().
 */

import { cnpjValido, formatarCnpj, normalizarCnpj } from './cnpj.ts'

/** Tira pontuação e espaços; deixa em maiúsculas. */
export const normalizarDocumento = normalizarCnpj

function digitoCpf(base: string, pesoInicial: number): number {
  let soma = 0
  for (let i = 0; i < pesoInicial - 1; i++) {
    soma += Number(base[i]) * (pesoInicial - i)
  }
  const resto = (soma * 10) % 11
  return resto === 10 ? 0 : resto
}

export function cpfValido(texto: string): boolean {
  const cpf = normalizarDocumento(texto)
  if (!/^\d{11}$/.test(cpf)) return false
  if (/^(.)\1{10}$/.test(cpf)) return false

  return digitoCpf(cpf, 10) === Number(cpf[9]) && digitoCpf(cpf, 11) === Number(cpf[10])
}

export function documentoValido(texto: string): boolean {
  const doc = normalizarDocumento(texto)
  return doc.length === 11 ? cpfValido(doc) : cnpjValido(doc)
}

/** CPF quando tem 11 dígitos, CNPJ quando tem 14 posições; senão, nenhum. */
export function tipoDocumento(texto: string): 'CPF' | 'CNPJ' | null {
  const doc = normalizarDocumento(texto)
  if (/^\d{11}$/.test(doc)) return 'CPF'
  if (doc.length === 14) return 'CNPJ'
  return null
}

/** 123.456.789-09 — aceita entrada parcial, para formatar enquanto digita. */
export function formatarCpf(texto: string): string {
  const c = normalizarDocumento(texto).slice(0, 11)
  if (c.length <= 3) return c
  if (c.length <= 6) return `${c.slice(0, 3)}.${c.slice(3)}`
  if (c.length <= 9) return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6)}`
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`
}

/**
 * Máscara de CPF até 11 dígitos; passou disso, ou apareceu letra, vira CNPJ.
 * Assim um único campo aceita os dois enquanto a pessoa digita.
 */
export function formatarDocumento(texto: string): string {
  const doc = normalizarDocumento(texto)
  if (doc.length <= 11 && /^\d*$/.test(doc)) return formatarCpf(doc)
  return formatarCnpj(doc)
}
