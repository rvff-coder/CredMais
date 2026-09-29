'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'

type Tom = 'sucesso' | 'erro'
type Aviso = { id: number; tom: Tom; texto: string }

type Contexto = {
  sucesso: (texto: string) => void
  erro: (texto: string) => void
}

const ContextoAvisos = createContext<Contexto | null>(null)

/** Toasts discretos no canto da tela, com leitura por leitor de tela. */
export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const proximo = useRef(1)

  const remover = useCallback((id: number) => {
    setAvisos((lista) => lista.filter((a) => a.id !== id))
  }, [])

  const mostrar = useCallback(
    (tom: Tom, texto: string) => {
      const id = proximo.current++
      setAvisos((lista) => [...lista.slice(-3), { id, tom, texto }])
      setTimeout(() => remover(id), tom === 'erro' ? 6000 : 3800)
    },
    [remover],
  )

  const valor = useMemo<Contexto>(
    () => ({ sucesso: (t) => mostrar('sucesso', t), erro: (t) => mostrar('erro', t) }),
    [mostrar],
  )

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2
                   sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tom === 'erro' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm animate-subir items-start gap-3 rounded-2xl border
                       border-borda-forte bg-painel-3/95 px-4 py-3 text-sm shadow-2xl shadow-black/50 backdrop-blur"
          >
            {a.tom === 'sucesso' ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-verde" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-vermelho" aria-hidden />
            )}
            <p className="flex-1 text-tinta">{a.texto}</p>
            <button
              type="button"
              onClick={() => remover(a.id)}
              className="-mr-1 rounded-md p-0.5 text-tinta-3 transition-colors hover:text-tinta"
              aria-label="Fechar aviso"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  )
}

export function useAvisos(): Contexto {
  const ctx = useContext(ContextoAvisos)
  if (!ctx) throw new Error('useAvisos precisa estar dentro de <ProvedorAvisos>')
  return ctx
}
