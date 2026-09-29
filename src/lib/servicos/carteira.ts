import 'server-only'

import { paraReais, type Centavos } from '@/lib/financeiro/dinheiro'
import type { DataISO } from '@/lib/financeiro/datas'
import { mensagemDeErro } from '@/lib/erros'
import type { ClienteSupabase } from '@/lib/supabase/server'
import type { CategoriaMovimentacao, Movimentacao, Pagina, TipoMovimentacao } from '@/lib/tipos'

/**
 * A carteira é um livro-caixa: o saldo é a soma das movimentações. Estas
 * funções nunca gravam um saldo; elas lançam entradas e saídas, e o banco
 * faz o lançamento e o evento da timeline na mesma transação.
 */

export async function calcularSaldo(supabase: ClienteSupabase): Promise<number> {
  const { data } = await supabase.rpc('saldo_carteira')
  return Number(data ?? 0)
}

/** Entrada manual: CARTEIRA = CARTEIRA + VALOR. */
export async function adicionarNaCarteira(
  supabase: ClienteSupabase,
  valor: Centavos,
  data: DataISO,
  observacao: string,
) {
  const { error } = await supabase.rpc('adicionar_valor', {
    p_valor: paraReais(valor),
    p_data: data,
    p_observacao: observacao,
  })
  return error ? mensagemDeErro(error, 'Não foi possível adicionar o valor. Tente novamente.') : null
}

/** Acerto: CARTEIRA = CARTEIRA - VALOR. Não mexe em empréstimos nem parcelas. */
export async function registrarAcerto(
  supabase: ClienteSupabase,
  clienteId: string,
  valor: Centavos,
  data: DataISO,
  observacao: string,
) {
  const { error } = await supabase.rpc('fazer_acerto', {
    p_cliente: clienteId,
    p_valor: paraReais(valor),
    p_data: data,
    p_observacao: observacao,
  })
  return error ? mensagemDeErro(error, 'Não foi possível registrar o acerto. Tente novamente.') : null
}

export type ResumoCarteira = {
  saldo: number
  total_entradas: number
  total_saidas: number
  entradas_periodo: number
  saidas_periodo: number
}

export async function obterResumoCarteira(
  supabase: ClienteSupabase,
  inicio: DataISO,
  fim: DataISO,
): Promise<ResumoCarteira> {
  const { data } = await supabase.rpc('resumo_carteira', { p_inicio: inicio, p_fim: fim })
  const r = (data ?? {}) as Record<string, number>
  return {
    saldo: Number(r.saldo ?? 0),
    total_entradas: Number(r.total_entradas ?? 0),
    total_saidas: Number(r.total_saidas ?? 0),
    entradas_periodo: Number(r.entradas_periodo ?? 0),
    saidas_periodo: Number(r.saidas_periodo ?? 0),
  }
}

export type PontoSerie = { periodo: DataISO; entradas: number; saidas: number }

export async function obterSerie(
  supabase: ClienteSupabase,
  inicio: DataISO,
  fim: DataISO,
  agrupar: 'dia' | 'mes',
): Promise<PontoSerie[]> {
  const { data } = await supabase.rpc('serie_movimentacoes', {
    p_inicio: inicio,
    p_fim: fim,
    p_agrupar: agrupar,
  })
  return ((data ?? []) as PontoSerie[]).map((p) => ({
    periodo: p.periodo,
    entradas: Number(p.entradas),
    saidas: Number(p.saidas),
  }))
}

export type FiltroExtrato = {
  tipo?: TipoMovimentacao
  categoria?: CategoriaMovimentacao
  busca?: string
  clienteId?: string
  pagina?: number
  porPagina?: number
}

export async function listarMovimentacoes(
  supabase: ClienteSupabase,
  filtro: FiltroExtrato = {},
): Promise<Pagina<Movimentacao>> {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 20

  let consulta = supabase.from('vw_movimentacoes').select('*', { count: 'exact' })

  if (filtro.tipo) consulta = consulta.eq('tipo', filtro.tipo)
  if (filtro.categoria) consulta = consulta.eq('categoria', filtro.categoria)
  if (filtro.clienteId) consulta = consulta.eq('cliente_id', filtro.clienteId)
  if (filtro.busca) {
    const termo = limparBusca(filtro.busca)
    const codigo = /^#?\d+$/.test(termo) ? Number(termo.replace('#', '')) : null
    if (codigo) consulta = consulta.eq('codigo', codigo)
    else if (termo) {
      consulta = consulta.or(
        `descricao.ilike.%${termo}%,cliente_nome.ilike.%${termo}%,usuario_nome.ilike.%${termo}%`,
      )
    }
  }

  const { data, count } = await consulta
    .order('created_at', { ascending: false })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1)

  return { itens: (data as Movimentacao[] | null) ?? [], total: count ?? 0, pagina, porPagina }
}

/** Tira do termo o que tem significado na sintaxe de filtro do PostgREST. */
export function limparBusca(texto: string): string {
  return texto.replace(/[%,()*\\"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}
