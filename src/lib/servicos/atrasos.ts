import 'server-only'

import type { ClienteSupabase } from '@/lib/supabase/server'

/**
 * Marca como EM_ATRASO as parcelas pendentes com vencimento passado e registra
 * o evento na timeline. É idempotente e barato (usa índice parcial), por isso
 * roda a cada carregamento das páginas. As telas também calculam o status
 * efetivo na leitura (vw_parcelas), então um atraso nunca fica invisível
 * mesmo que esta rotina ainda não tenha rodado no dia.
 */
export async function verificarAtrasos(supabase: ClienteSupabase): Promise<void> {
  const { error } = await supabase.rpc('atualizar_atrasos')
  if (error) console.error('Falha ao atualizar atrasos:', error.message)
}
