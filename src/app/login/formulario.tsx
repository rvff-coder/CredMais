'use client'

import { useActionState, useState } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

import { Botao, CLASSE_CAMPO, Campo, Rotulo, cx } from '@/components/ui'

import { entrar, type EstadoLogin } from './acoes'

const INICIAL: EstadoLogin = { erro: null }

export function FormularioLogin({ de }: { de: string }) {
  const [estado, acao, enviando] = useActionState(entrar, INICIAL)
  const [verSenha, setVerSenha] = useState(false)

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="de" value={de} />

      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required autoFocus placeholder="voce@empresa.com" />

      <label className="flex flex-col gap-1.5">
        <Rotulo>Senha</Rotulo>
        <span className="relative">
          <input
            name="senha"
            type={verSenha ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className={cx(CLASSE_CAMPO, 'pr-11')}
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-tinta-3 hover:text-tinta"
            aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {verSenha ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </span>
      </label>

      {estado.erro && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-vermelho-fundo px-3 py-2.5 text-sm text-vermelho">
          <AlertCircle className="size-4 shrink-0" aria-hidden /> {estado.erro}
        </p>
      )}

      <Botao type="submit" tamanho="lg" disabled={enviando} className="mt-1 w-full">
        {enviando ? 'Entrando…' : 'Entrar'}
      </Botao>
    </form>
  )
}
