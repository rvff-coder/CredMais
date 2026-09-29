'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

import { cx } from '@/components/ui'

/**
 * Modal sobre o <dialog> nativo: foco preso dentro, Esc fecha, o resto da
 * página fica inerte e ele sempre fica na camada de cima.
 */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  largura = 'max-w-lg',
  bloquearFechar = false,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: ReactNode
  descricao?: ReactNode
  children: ReactNode
  rodape?: ReactNode
  largura?: string
  /** Durante o envio, Esc e clique fora não fecham. */
  bloquearFechar?: boolean
}) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogo.current
    if (!el) return
    if (aberto && !el.open) el.showModal()
    else if (!aberto && el.open) el.close()
  }, [aberto])

  return (
    <dialog
      ref={dialogo}
      onClose={aoFechar}
      onCancel={(e) => {
        if (bloquearFechar) e.preventDefault()
      }}
      onClick={(e) => {
        if (e.target === dialogo.current && !bloquearFechar) dialogo.current?.close()
      }}
      className={cx(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-hidden rounded-painel border border-borda-forte',
        'bg-painel-2 p-0 text-left text-tinta shadow-2xl shadow-black/60',
        largura,
      )}
    >
      {aberto && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
              {descricao && <p className="text-sm text-tinta-3">{descricao}</p>}
            </div>
            <button
              type="button"
              onClick={() => !bloquearFechar && dialogo.current?.close()}
              aria-label="Fechar"
              className="-mt-1 -mr-2 rounded-lg p-1.5 text-tinta-3 transition-colors hover:bg-painel-4 hover:text-tinta"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
          {rodape && (
            <footer className="flex flex-col-reverse gap-2 border-t border-borda bg-painel/60 px-6 py-4 sm:flex-row sm:justify-end">
              {rodape}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
