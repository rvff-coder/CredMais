import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function criarClienteServidor() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesParaGravar) {
          try {
            for (const { name, value, options } of cookiesParaGravar) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Component não pode gravar cookie. O proxy já renova a
            // sessão a cada requisição, então é seguro ignorar aqui.
          }
        },
      },
    },
  )
}

export type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>
