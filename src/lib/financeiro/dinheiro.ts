/**
 * Dinheiro em centavos inteiros.
 *
 * Toda conta financeira do app passa por aqui. Número de ponto flutuante não
 * guarda 0,10 com exatidão, e alguns centavos perdidos em 24 parcelas viram
 * diferença no caixa. Por isso os cálculos trabalham com inteiros e só viram
 * reais na hora de mostrar ou de enviar ao banco.
 */

export type Centavos = number

/**
 * Menor empréstimo aceito: R$ 10,00. Abaixo disso, dividir em 24 parcelas
 * arredondadas pode deixar a última com valor zero ou negativo.
 */
export const EMPRESTIMO_MINIMO: Centavos = 10_00

/** Maior valor aceito numa operação: R$ 100.000.000,00. Igual ao banco. */
export const VALOR_MAXIMO: Centavos = 100_000_000_00

const formatador = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Reais (como vêm do banco, número ou string numérica) para centavos. */
export function paraCentavos(reais: number | string | null | undefined): Centavos {
  if (reais === null || reais === undefined || reais === '') return 0
  const n = typeof reais === 'string' ? Number(reais) : reais
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

/** Centavos para a string decimal que o Postgres grava sem arredondar. */
export function paraReais(centavos: Centavos): string {
  const negativo = centavos < 0
  const abs = Math.abs(centavos)
  const inteiro = Math.floor(abs / 100)
  const resto = String(abs % 100).padStart(2, '0')
  return `${negativo ? '-' : ''}${inteiro}.${resto}`
}

/** R$ 1.000,00 */
export function formatarMoeda(centavos: Centavos): string {
  // Intl coloca um espaço não separável entre "R$" e o número; troca por
  // espaço comum para o texto copiado ficar igual ao digitado.
  return formatador.format(centavos / 100).replace(/ /g, ' ')
}

/** Mesmo formato, com sinal explícito: + R$ 56,25 / - R$ 1.000,00 */
export function formatarMoedaComSinal(centavos: Centavos, sinal: '+' | '-'): string {
  return `${sinal} ${formatarMoeda(Math.abs(centavos))}`
}

/**
 * Lê o que a pessoa digitou num campo de valor: "1.000,50", "1000,5",
 * "R$ 56,25". Devolve null quando não dá para entender sem adivinhar.
 */
export function lerValorDigitado(texto: string): Centavos | null {
  const limpo = texto.replace(/[R$\s]/g, '')
  if (!limpo) return null
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return null

  const [inteiro, decimal = ''] = limpo.replace(/\./g, '').split(',')
  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'))
  return Number.isSafeInteger(centavos) ? centavos : null
}

/** Formata enquanto a pessoa digita, tratando a entrada como centavos. */
export function mascararValor(texto: string): string {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12)
  if (!digitos) return ''
  const centavos = Number(digitos)
  return formatador.format(centavos / 100).replace(/^R\$\s?/, '').replace(/ /g, ' ')
}

/**
 * Divisão arredondando meio centavo para cima, como o round() do Postgres
 * faz com numeric positivo. Só para inteiros não negativos.
 */
export function dividirArredondando(dividendo: number, divisor: number): number {
  return Math.floor((dividendo * 2 + divisor) / (divisor * 2))
}
