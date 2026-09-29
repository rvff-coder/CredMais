import { NextResponse, type NextRequest } from 'next/server'

import { criarClienteServidor } from '@/lib/supabase/server'

/** Encerra a sessão e volta ao login. Abrir /sair no navegador basta. */
async function sair(request: NextRequest) {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  // 303: depois de um POST, o navegador segue com GET.
  return NextResponse.redirect(new URL('/login', request.url), 303)
}

export { sair as GET, sair as POST }
