import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Rotas acessíveis sem sessão. */
const PUBLICAS = ['/login', '/sair']

export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesParaGravar) {
          for (const { name, value } of cookiesParaGravar) {
            request.cookies.set(name, value)
          }
          resposta = NextResponse.next({ request })
          for (const { name, value, options } of cookiesParaGravar) {
            resposta.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Nada entre a criação do cliente e esta chamada: é ela que renova o token
  // e regrava os cookies na resposta.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const caminho = request.nextUrl.pathname
  const ehPublica = PUBLICAS.some((p) => caminho === p || caminho.startsWith(`${p}/`))

  if (!user && !ehPublica) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    destino.search = ''
    if (caminho !== '/') destino.searchParams.set('de', caminho)
    return NextResponse.redirect(destino)
  }

  if (user && caminho === '/login') {
    const destino = request.nextUrl.clone()
    destino.pathname = '/'
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  return resposta
}
