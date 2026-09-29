import 'server-only'

import type { ClienteSupabase } from '@/lib/supabase/server'
import { hojeBR } from '@/lib/financeiro/datas'
import type { Parcela } from '@/lib/tipos'

export type ResumoPainel = {
  carteira: number
  total_emprestado: number
  total_a_receber: number
  recebido_hoje: number
  recebimentos_hoje: number
  emprestimos_ativos: number
  parcelas_atrasadas: number
  vencendo_hoje: number
}

export async function obterResumoPainel(supabase: ClienteSupabase): Promise<ResumoPainel> {
  const { data } = await supabase.rpc('resumo_painel')
  const r = (data ?? {}) as Record<string, number>
  return {
    carteira: Number(r.carteira ?? 0),
    total_emprestado: Number(r.total_emprestado ?? 0),
    total_a_receber: Number(r.total_a_receber ?? 0),
    recebido_hoje: Number(r.recebido_hoje ?? 0),
    recebimentos_hoje: Number(r.recebimentos_hoje ?? 0),
    emprestimos_ativos: Number(r.emprestimos_ativos ?? 0),
    parcelas_atrasadas: Number(r.parcelas_atrasadas ?? 0),
    vencendo_hoje: Number(r.vencendo_hoje ?? 0),
  }
}

/** Parcelas com vencimento hoje, pagas ou não. */
export async function listarPagamentosDeHoje(supabase: ClienteSupabase, limite = 50): Promise<Parcela[]> {
  // Sem filtro de status do empréstimo: um empréstimo quitado hoje já está
  // FINALIZADO, mas a parcela paga hoje continua sendo pagamento do dia.
  const { data } = await supabase
    .from('vw_parcelas')
    .select('*')
    .eq('data_vencimento', hojeBR())
    .order('status', { ascending: false })
    .order('cliente_nome')
    .limit(limite)

  return (data as Parcela[] | null) ?? []
}

export async function listarParcelasEmAtraso(
  supabase: ClienteSupabase,
  limite = 20,
): Promise<{ itens: Parcela[]; total: number }> {
  const { data, count } = await supabase
    .from('vw_parcelas')
    .select('*', { count: 'exact' })
    .neq('status', 'PAGO')
    .lt('data_vencimento', hojeBR())
    .eq('emprestimo_status', 'ATIVO')
    .order('data_vencimento')
    .limit(limite)
  return { itens: (data as Parcela[] | null) ?? [], total: count ?? 0 }
}
