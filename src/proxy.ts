import type { NextRequest } from 'next/server'

import { atualizarSessao } from '@/lib/supabase/proxy'

/** No Next 16 o antigo `middleware.ts` se chama `proxy`. */
export async function proxy(request: NextRequest) {
  return atualizarSessao(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
