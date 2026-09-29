'use client'

import { AlertTriangle } from 'lucide-react'

import { Botao } from '@/components/ui'

/** Falha inesperada numa página: mensagem humana, nunca o erro técnico. */
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-vermelho-fundo text-vermelho">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Não foi possível carregar esta página.</h1>
        <p className="text-sm text-tinta-3">Verifique sua conexão e tente novamente.</p>
      </div>
      <Botao onClick={reset}>Tentar novamente</Botao>
    </div>
  )
}
