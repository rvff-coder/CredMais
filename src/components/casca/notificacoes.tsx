'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

import { cx } from '@/components/ui'
import { formatarMoeda, type Centavos } from '@/lib/financeiro/dinheiro'

type Item = {
  id: string
  tom: 'vermelho' | 'azul'
  titulo: string
  texto: string
  valor: Centavos
  href: string
}

export function Notificacoes({ itens, extra }: { itens: Item[]; extra: number }) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const quantidade = itens.length + extra

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-label={quantidade ? `Notificações: ${quantidade}` : 'Notificações'}
        className="relative grid size-10 place-items-center rounded-xl border border-borda bg-painel-2 text-tinta-2 transition-colors hover:border-borda-forte hover:text-tinta"
      >
        <Bell className="size-[18px]" aria-hidden />
        {quantidade > 0 && (
          <span className="numeros absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-azul px-1 text-[10px] leading-5 font-semibold text-white ring-2 ring-fundo">
            {quantidade > 99 ? '99+' : quantidade}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute top-full right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-entrar overflow-hidden rounded-2xl border border-borda-forte bg-painel-3 shadow-2xl shadow-black/60">
          <p className="border-b border-borda px-4 py-3 text-sm font-semibold">Notificações</p>
          {itens.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-xs text-tinta-3">
              <BellOff className="size-5" aria-hidden />
              Nenhuma pendência por aqui.
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-borda overflow-y-auto">
              {itens.map((i) => (
                <li key={i.id}>
                  <Link
                    href={i.href}
                    onClick={() => setAberto(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-painel-4"
                  >
                    <span
                      className={cx('mt-1.5 size-2 shrink-0 rounded-full', i.tom === 'vermelho' ? 'bg-vermelho' : 'bg-azul')}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{i.titulo}</span>
                      <span className="block text-xs text-tinta-3">{i.texto}</span>
                    </span>
                    <span className="numeros text-xs font-medium text-tinta-2">{formatarMoeda(i.valor)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {extra > 0 && (
            <Link
              href="/emprestimos?situacao=EM_ATRASO"
              onClick={() => setAberto(false)}
              className="block border-t border-borda px-4 py-2.5 text-center text-xs font-medium text-azul-claro hover:bg-painel-4"
            >
              Ver mais {extra} em atraso
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
