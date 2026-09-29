'use client'

import { useState, type ComponentProps } from 'react'

import { CLASSE_CAMPO, Rotulo, cx } from '@/components/ui'
import { lerValorDigitado, mascararValor, type Centavos } from '@/lib/financeiro/dinheiro'
import { cnpjValido, formatarCnpj, normalizarCnpj } from '@/lib/validacao/cnpj'

/**
 * Campo de valor em reais. Formata enquanto digita (os dígitos entram como
 * centavos, como em app de banco) e avisa o pai em centavos.
 */
export function CampoMoeda({
  rotulo,
  name,
  valorInicial = '',
  aoMudar,
  erro,
  dica,
  autoFocus,
  className,
}: {
  rotulo: string
  name: string
  valorInicial?: string
  aoMudar?: (centavos: Centavos | null) => void
  erro?: string
  dica?: string
  autoFocus?: boolean
  className?: string
}) {
  const [texto, setTexto] = useState(valorInicial)

  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <Rotulo dica={dica}>{rotulo}</Rotulo>
      <span className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-tinta-3">R$</span>
        <input
          name={name}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0,00"
          autoFocus={autoFocus}
          value={texto}
          aria-invalid={erro ? true : undefined}
          onChange={(e) => {
            const novo = mascararValor(e.target.value)
            setTexto(novo)
            aoMudar?.(novo ? lerValorDigitado(novo) : null)
          }}
          className={cx(CLASSE_CAMPO, 'numeros pl-10 text-base font-medium')}
        />
      </span>
      {erro && <span className="text-xs text-vermelho">{erro}</span>}
    </label>
  )
}

/** CNPJ com máscara e validação ao sair do campo. Aceita o alfanumérico. */
export function CampoCnpj({
  valorInicial = '',
  erroServidor,
  ...props
}: Omit<ComponentProps<'input'>, 'defaultValue' | 'value' | 'onChange'> & {
  valorInicial?: string
  erroServidor?: string
}) {
  const [texto, setTexto] = useState(formatarCnpj(valorInicial))
  const [tocado, setTocado] = useState(false)

  const completo = normalizarCnpj(texto).length === 14
  const invalido = tocado && texto !== '' && (!completo || !cnpjValido(texto))
  const erro = invalido ? 'CNPJ inválido. Confira os números.' : erroServidor

  return (
    <label className="flex flex-col gap-1.5">
      <Rotulo dica={completo && cnpjValido(texto) ? '✓ válido' : undefined}>CNPJ</Rotulo>
      <input
        {...props}
        value={texto}
        onChange={(e) => setTexto(formatarCnpj(e.target.value))}
        onBlur={() => setTocado(true)}
        placeholder="00.000.000/0000-00"
        autoComplete="off"
        autoCapitalize="characters"
        aria-invalid={erro ? true : undefined}
        className={cx(CLASSE_CAMPO, 'numeros uppercase')}
      />
      {erro && <span className="text-xs text-vermelho">{erro}</span>}
    </label>
  )
}

/** Seletor nativo com a aparência dos demais campos. */
export function Selecao({
  rotulo,
  children,
  className,
  ...props
}: ComponentProps<'select'> & { rotulo: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <Rotulo>{rotulo}</Rotulo>
      <select className={cx(CLASSE_CAMPO, 'appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
