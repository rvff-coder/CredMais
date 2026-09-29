import { NextResponse, type NextRequest } from 'next/server'

import { linkDoComprovante } from '@/lib/servicos/pagamentos'
import { obterSessao } from '@/lib/servicos/sessao'

/**
 * Abre um comprovante. O bucket é privado: aqui geramos um link assinado de
 * poucos minutos e redirecionamos, sempre com a sessão de quem pediu.
 */
export async function GET(request: NextRequest, { params }: RouteContext<'/comprovantes/[id]'>) {
  const { id } = await params
  const { supabase, usuario } = await obterSessao()
  if (!usuario) return NextResponse.redirect(new URL('/login', request.url))

  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Comprovante não encontrado.', { status: 404 })

  const link = await linkDoComprovante(supabase, id)
  if (!link) return new NextResponse('Comprovante não encontrado.', { status: 404 })

  return NextResponse.redirect(link)
}
