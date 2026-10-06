import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/*
 * Peças básicas da interface. Sem estado, então servem tanto a Server quanto
 * a Client Components.
 */

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'sucesso'
type Tamanho = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-azul text-white shadow-[0_8px_24px_-8px_rgb(47_123_245/0.6)] hover:bg-azul-claro active:bg-azul-escuro',
  secundario: 'bg-painel-3 text-tinta border border-borda hover:bg-painel-4 hover:border-borda-forte',
  fantasma: 'text-tinta-2 hover:bg-painel-3 hover:text-tinta',
  perigo: 'bg-vermelho-fundo text-vermelho border border-vermelho/20 hover:bg-vermelho/20',
  sucesso: 'bg-verde text-[#04140d] shadow-[0_8px_24px_-8px_rgb(52_211_153/0.5)] hover:brightness-110',
}

const TAMANHOS: Record<Tamanho, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-sm gap-2 rounded-xl',
}

export function classesBotao(variante: Variante = 'primario', tamanho: Tamanho = 'md', extra?: string) {
  return cx(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all duration-150',
    'disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]',
    VARIANTES[variante],
    TAMANHOS[tamanho],
    extra,
  )
}

export function Botao({
  variante = 'primario',
  tamanho = 'md',
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variante?: Variante; tamanho?: Tamanho }) {
  return <button type={type} className={classesBotao(variante, tamanho, className)} {...props} />
}

export function BotaoLink({
  variante = 'primario',
  tamanho = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho }) {
  return <Link className={classesBotao(variante, tamanho, className)} {...props} />
}

export const CLASSE_CAMPO =
  'h-11 w-full rounded-xl border border-borda bg-painel-2 px-3.5 text-sm text-tinta placeholder:text-tinta-4 ' +
  'transition-colors hover:border-borda-forte focus:border-azul focus:bg-painel-3 focus:outline-none ' +
  'disabled:opacity-50 aria-[invalid=true]:border-vermelho/60'

export function Rotulo({ children, dica }: { children: ReactNode; dica?: ReactNode }) {
  return (
    <span className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-medium text-tinta-2">{children}</span>
      {dica && <span className="text-[11px] text-tinta-4">{dica}</span>}
    </span>
  )
}

export function Campo({
  rotulo,
  dica,
  erro,
  className,
  ...props
}: ComponentProps<'input'> & { rotulo: string; dica?: ReactNode; erro?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <Rotulo dica={dica}>{rotulo}</Rotulo>
      <input className={CLASSE_CAMPO} aria-invalid={erro ? true : undefined} {...props} />
      {erro && <span className="text-xs text-vermelho">{erro}</span>}
    </label>
  )
}

export function AreaTexto({
  rotulo,
  className,
  ...props
}: ComponentProps<'textarea'> & { rotulo: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <Rotulo>{rotulo}</Rotulo>
      <textarea
        className={cx(CLASSE_CAMPO, 'h-auto min-h-20 resize-y py-2.5 leading-relaxed')}
        {...props}
      />
    </label>
  )
}

export function Cartao({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cx('rounded-cartao border border-borda bg-painel', className)} {...props} />
}

/** Pílula cinza de data/hora, como as do print de referência. */
export function Pilula({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'numeros inline-flex items-center gap-1 rounded-md bg-painel-4/80 px-1.5 py-0.5 text-[11px] font-medium text-tinta-2',
        className,
      )}
    >
      {children}
    </span>
  )
}

export type TomSelo = 'azul' | 'verde' | 'vermelho' | 'ambar' | 'cinza' | 'violeta'

const TONS_SELO: Record<TomSelo, string> = {
  azul: 'bg-azul-fundo text-azul-claro',
  verde: 'bg-verde-fundo text-verde',
  vermelho: 'bg-vermelho-fundo text-vermelho',
  ambar: 'bg-ambar-fundo text-ambar',
  cinza: 'bg-painel-4 text-tinta-2',
  violeta: 'bg-violeta-fundo text-violeta',
}

export function Selo({ tom, children, className }: { tom: TomSelo; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        TONS_SELO[tom],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  )
}

const CORES_AVATAR = [
  'bg-[#3b3b44] text-[#c9c9d6]',
  'bg-[#23324d] text-[#9dc0ff]',
  'bg-[#2b3d35] text-[#9ee0bf]',
  'bg-[#43302a] text-[#f3b89e]',
  'bg-[#3a2d48] text-[#cbb2f5]',
  'bg-[#443a24] text-[#f0d189]',
]

export function iniciais(nome: string) {
  const partes = nome
    .replace(/\b(ltda|me|eireli|s\/?a|epp)\b\.?/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export function Avatar({ nome, tamanho = 'md', className }: { nome: string; tamanho?: 'sm' | 'md' | 'lg'; className?: string }) {
  let soma = 0
  for (const c of nome) soma += c.charCodeAt(0)
  const cor = CORES_AVATAR[soma % CORES_AVATAR.length]
  const t = tamanho === 'sm' ? 'size-7 text-[10px]' : tamanho === 'lg' ? 'size-14 text-lg' : 'size-9 text-xs'
  return (
    <span
      className={cx('inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-wide', cor, t, className)}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  )
}

export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone?: ReactNode
  titulo: string
  descricao?: string
  acao?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      {icone && (
        <span className="grid size-12 place-items-center rounded-2xl border border-borda bg-painel-2 text-tinta-3">
          {icone}
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-tinta">{titulo}</p>
        {descricao && <p className="mx-auto max-w-xs text-xs leading-relaxed text-tinta-3">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}

/** No celular, a ação (abas de período, links) desce para baixo do título em vez de espremê-lo. */
export function TituloSecao({ children, acao, className }: { children: ReactNode; acao?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-x-3 gap-y-2', className)}>
      <h2 className="text-[15px] font-semibold tracking-tight text-tinta">{children}</h2>
      {acao}
    </div>
  )
}

/** Linha "rótulo: valor" dos resumos. */
export function Dado({ rotulo, children, destaque }: { rotulo: string; children: ReactNode; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-xs text-tinta-3">{rotulo}</dt>
      <dd className={cx('numeros text-right text-sm', destaque ? 'font-semibold text-tinta' : 'text-tinta-2')}>{children}</dd>
    </div>
  )
}
