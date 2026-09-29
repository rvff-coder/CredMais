'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

import { cx } from '@/components/ui'

/**
 * Busca que vive na URL (?q=). A página é Server Component e filtra no banco;
 * aqui só mantemos o texto e atualizamos o endereço com um pequeno atraso.
 */
export function BarraBusca({ placeholder = 'Buscar', className }: { placeholder?: string; className?: string }) {
  const router = useRouter()
  const caminho = usePathname()
  const params = useSearchParams()
  const [texto, setTexto] = useState(params.get('q') ?? '')
  const [, iniciar] = useTransition()

  useEffect(() => {
    const atual = params.get('q') ?? ''
    if (texto === atual) return
    const t = setTimeout(() => {
      const novos = new URLSearchParams(params.toString())
      if (texto) novos.set('q', texto)
      else novos.delete('q')
      novos.delete('p')
      iniciar(() => router.replace(`${caminho}?${novos.toString()}`, { scroll: false }))
    }, 300)
    return () => clearTimeout(t)
  }, [texto, params, caminho, router])

  return (
    <label className={cx('relative flex items-center', className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-tinta-3" aria-hidden />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-borda bg-painel-2 pr-3 pl-9 text-sm text-tinta
                   placeholder:text-tinta-4 transition-colors hover:border-borda-forte focus:border-azul
                   focus:outline-none"
      />
    </label>
  )
}

/** Chips de filtro que gravam na URL. Clicar no ativo limpa o filtro. */
export function Filtros({
  nome,
  opcoes,
  rotulo,
}: {
  nome: string
  opcoes: { valor: string; rotulo: string }[]
  rotulo?: string
}) {
  const caminho = usePathname()
  const params = useSearchParams()
  const atual = params.get(nome)

  function href(valor: string | null) {
    const novos = new URLSearchParams(params.toString())
    if (valor) novos.set(nome, valor)
    else novos.delete(nome)
    novos.delete('p')
    const qs = novos.toString()
    return qs ? `${caminho}?${qs}` : caminho
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={rotulo}>
      {rotulo && <span className="mr-1 text-[11px] font-medium tracking-wide text-tinta-4 uppercase">{rotulo}</span>}
      {opcoes.map((o) => {
        const ativo = atual === o.valor
        return (
          <Link
            key={o.valor}
            href={href(ativo ? null : o.valor)}
            scroll={false}
            aria-pressed={ativo}
            className={cx(
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              ativo
                ? 'border-azul/40 bg-azul-fundo text-azul-claro'
                : 'border-borda bg-painel-2 text-tinta-2 hover:border-borda-forte hover:text-tinta',
            )}
          >
            {o.rotulo}
          </Link>
        )
      })}
    </div>
  )
}

export function Paginacao({ pagina, total, porPagina }: { pagina: number; total: number; porPagina: number }) {
  const caminho = usePathname()
  const params = useSearchParams()
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (total <= porPagina) return null

  function href(p: number) {
    const novos = new URLSearchParams(params.toString())
    if (p > 1) novos.set('p', String(p))
    else novos.delete('p')
    const qs = novos.toString()
    return qs ? `${caminho}?${qs}` : caminho
  }

  const de = (pagina - 1) * porPagina + 1
  const ate = Math.min(total, pagina * porPagina)
  const classe = 'grid size-8 place-items-center rounded-lg border border-borda bg-painel-2 text-tinta-2 transition-colors hover:text-tinta hover:border-borda-forte'

  return (
    <nav className="flex items-center justify-between gap-3 pt-4 text-xs text-tinta-3" aria-label="Paginação">
      <span className="numeros">
        {de}–{ate} de {total}
      </span>
      <div className="flex items-center gap-2">
        {pagina > 1 ? (
          <Link href={href(pagina - 1)} className={classe} aria-label="Página anterior">
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={cx(classe, 'opacity-40')} aria-hidden>
            <ChevronLeft className="size-4" />
          </span>
        )}
        <span className="numeros px-1">
          {pagina} / {paginas}
        </span>
        {pagina < paginas ? (
          <Link href={href(pagina + 1)} className={classe} aria-label="Próxima página">
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={cx(classe, 'opacity-40')} aria-hidden>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  )
}

/** Abas por parâmetro de URL (ex.: período do gráfico). */
export function Abas({
  nome,
  opcoes,
  padrao,
}: {
  nome: string
  opcoes: { valor: string; rotulo: ReactNode }[]
  padrao: string
}) {
  const caminho = usePathname()
  const params = useSearchParams()
  const atual = params.get(nome) ?? padrao

  return (
    <div className="inline-flex rounded-xl border border-borda bg-painel-2 p-0.5">
      {opcoes.map((o) => {
        const novos = new URLSearchParams(params.toString())
        if (o.valor === padrao) novos.delete(nome)
        else novos.set(nome, o.valor)
        const qs = novos.toString()
        const ativo = atual === o.valor
        return (
          <Link
            key={o.valor}
            href={qs ? `${caminho}?${qs}` : caminho}
            scroll={false}
            aria-current={ativo ? 'true' : undefined}
            className={cx(
              'rounded-[10px] px-2.5 py-1 text-xs font-medium transition-colors',
              ativo ? 'bg-painel-4 text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta',
            )}
          >
            {o.rotulo}
          </Link>
        )
      })}
    </div>
  )
}
