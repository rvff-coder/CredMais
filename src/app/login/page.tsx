import type { Metadata } from 'next'

import { Marca } from '@/components/casca/logo'

import { FormularioLogin } from './formulario'

export const metadata: Metadata = { title: 'Entrar' }

export default async function PaginaLogin({ searchParams }: PageProps<'/login'>) {
  const { de } = await searchParams

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      {/* Brilho azul difuso no fundo, discreto. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-azul/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <div className="relative w-full max-w-sm animate-subir">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Marca className="size-12" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Entrar no CredMais</h1>
            <p className="text-sm text-tinta-3">Gestão de empréstimos, parcelas e carteira.</p>
          </div>
        </div>

        <div className="rounded-painel border border-borda bg-painel/80 p-6 shadow-2xl shadow-black/50 backdrop-blur">
          <FormularioLogin de={typeof de === 'string' ? de : '/'} />
        </div>

        <p className="mt-6 text-center text-xs text-tinta-4">Acesso restrito. Contas são criadas pelo administrador.</p>
      </div>
    </div>
  )
}
