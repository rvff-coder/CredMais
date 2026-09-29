import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { criarClienteServidor } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/tipos'

/**
 * Cliente do Supabase com a sessão de quem está usando. Toda operação passa
 * por aqui: sem usuário, não há consulta nem escrita (o proxy redireciona as
 * páginas; esta checagem cobre as server actions, que são endpoints próprios).
 */
export const obterSessao = cache(async () => {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, usuario: user }
})

/** Para páginas: sem sessão, volta ao login. */
export async function exigirSessao() {
  const { supabase, usuario } = await obterSessao()
  if (!usuario) redirect('/login')
  return { supabase, usuario }
}

/** Para server actions: devolve null em vez de redirecionar. */
export async function sessaoDaAcao() {
  const { supabase, usuario } = await obterSessao()
  if (!usuario) return null
  return { supabase, usuario }
}

export const obterPerfil = cache(async (): Promise<Perfil | null> => {
  const { supabase, usuario } = await obterSessao()
  if (!usuario) return null

  const { data } = await supabase.from('perfis').select('id, nome, email').eq('id', usuario.id).maybeSingle()
  return (
    (data as Perfil | null) ?? {
      id: usuario.id,
      nome: usuario.email?.split('@')[0] ?? 'Usuário',
      email: usuario.email ?? null,
    }
  )
})
