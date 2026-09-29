'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { criarClienteServidor } from '@/lib/supabase/server'

export type EstadoLogin = { erro: string | null }

/** Só caminhos internos: "/clientes" sim, "//site.com" ou "https://…" não. */
function destinoSeguro(valor: FormDataEntryValue | null): string {
  const d = typeof valor === 'string' ? valor : ''
  return d.startsWith('/') && !d.startsWith('//') && !d.startsWith('/\\') ? d : '/'
}

export async function entrar(_anterior: EstadoLogin, dados: FormData): Promise<EstadoLogin> {
  const email = String(dados.get('email') ?? '').trim()
  const senha = String(dados.get('senha') ?? '')
  const de = destinoSeguro(dados.get('de'))

  if (!email || !senha) return { erro: 'Preencha e-mail e senha.' }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error) {
    // A mensagem do Supabase vem em inglês e diz demais sobre a conta.
    return { erro: 'E-mail ou senha incorretos.' }
  }

  revalidatePath('/', 'layout')
  redirect(de)
}
