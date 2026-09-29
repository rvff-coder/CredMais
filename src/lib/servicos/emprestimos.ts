import 'server-only'

import { paraReais, type Centavos } from '@/lib/financeiro/dinheiro'
import type { DataISO } from '@/lib/financeiro/datas'
import type { Modalidade } from '@/lib/financeiro/emprestimo'
import { mensagemDeErro } from '@/lib/erros'
import { limparBusca } from '@/lib/servicos/carteira'
import type { ClienteSupabase } from '@/lib/supabase/server'
import type { EmprestimoResumo, Pagina, Parcela, SituacaoEmprestimo } from '@/lib/tipos'

export type DadosNovoEmprestimo = {
  clienteId: string
  principal: Centavos
  modalidade: Modalidade
  data: DataISO
  observacao: string
  /** Limiar mostrado na prévia. Se o banco estiver com outro, recusa. */
  limiarEsperado: number
}

/**
 * Cria o empréstimo numa transação única no banco: confere o saldo, grava o
 * empréstimo com cópia do limiar, gera as parcelas, tira o principal da
 * carteira e registra o evento na timeline.
 */
export async function criarEmprestimo(
  supabase: ClienteSupabase,
  dados: DadosNovoEmprestimo,
): Promise<{ id: string } | { erro: string; codigo: string }> {
  const { data, error } = await supabase.rpc('criar_emprestimo', {
    p_cliente: dados.clienteId,
    p_valor: paraReais(dados.principal),
    p_modalidade: dados.modalidade,
    p_data: dados.data,
    p_observacao: dados.observacao,
    p_limiar_esperado: dados.limiarEsperado,
  })

  if (error) {
    return {
      erro: mensagemDeErro(error, 'Não foi possível criar o empréstimo. Tente novamente.'),
      codigo: error.message,
    }
  }
  return { id: data as string }
}

export type FiltroEmprestimos = {
  situacao?: SituacaoEmprestimo
  modalidade?: Modalidade
  clienteId?: string
  busca?: string
  pagina?: number
  porPagina?: number
}

export async function listarEmprestimos(
  supabase: ClienteSupabase,
  filtro: FiltroEmprestimos = {},
): Promise<Pagina<EmprestimoResumo>> {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 20

  let consulta = supabase.from('vw_emprestimos').select('*', { count: 'exact' })

  if (filtro.situacao === 'ATIVO') consulta = consulta.eq('status', 'ATIVO')
  else if (filtro.situacao) consulta = consulta.eq('situacao', filtro.situacao)
  if (filtro.modalidade) consulta = consulta.eq('modalidade', filtro.modalidade)
  if (filtro.clienteId) consulta = consulta.eq('cliente_id', filtro.clienteId)
  if (filtro.busca) {
    const termo = limparBusca(filtro.busca)
    const codigo = /^#?\d+$/.test(termo) ? Number(termo.replace('#', '')) : null
    if (codigo) consulta = consulta.eq('codigo', codigo)
    else if (termo) consulta = consulta.ilike('cliente_nome', `%${termo}%`)
  }

  const { data, count } = await consulta
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1)

  return { itens: (data as EmprestimoResumo[] | null) ?? [], total: count ?? 0, pagina, porPagina }
}

export async function obterEmprestimo(supabase: ClienteSupabase, id: string): Promise<EmprestimoResumo | null> {
  const { data } = await supabase.from('vw_emprestimos').select('*').eq('id', id).maybeSingle()
  return (data as EmprestimoResumo | null) ?? null
}

export async function listarEmprestimosDoCliente(
  supabase: ClienteSupabase,
  clienteId: string,
): Promise<EmprestimoResumo[]> {
  const { data } = await supabase
    .from('vw_emprestimos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(100)
  return (data as EmprestimoResumo[] | null) ?? []
}

export type ParcelaComResponsavel = Parcela & { responsavel_nome: string | null }

export async function listarParcelas(
  supabase: ClienteSupabase,
  emprestimoId: string,
): Promise<ParcelaComResponsavel[]> {
  const { data } = await supabase
    .from('vw_parcelas')
    .select('*')
    .eq('emprestimo_id', emprestimoId)
    .order('numero_parcela')

  const parcelas = (data as Parcela[] | null) ?? []
  const ids = [...new Set(parcelas.map((p) => p.usuario_confirmacao_id).filter(Boolean))] as string[]
  const nomes = new Map<string, string>()
  if (ids.length) {
    const { data: perfis } = await supabase.from('perfis').select('id, nome').in('id', ids)
    for (const p of (perfis as { id: string; nome: string }[] | null) ?? []) nomes.set(p.id, p.nome)
  }

  return parcelas.map((p) => ({
    ...p,
    responsavel_nome: p.usuario_confirmacao_id ? (nomes.get(p.usuario_confirmacao_id) ?? null) : null,
  }))
}

/** A próxima parcela em aberto de cada empréstimo ativo do cliente. */
export async function proximasParcelasDoCliente(
  supabase: ClienteSupabase,
  clienteId: string,
): Promise<Parcela[]> {
  const { data } = await supabase
    .from('vw_parcelas')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('emprestimo_status', 'ATIVO')
    .neq('status', 'PAGO')
    .order('numero_parcela')
    .limit(500)

  const vistas = new Set<string>()
  const proximas: Parcela[] = []
  for (const p of (data as Parcela[] | null) ?? []) {
    if (vistas.has(p.emprestimo_id)) continue
    vistas.add(p.emprestimo_id)
    proximas.push(p)
  }
  return proximas
}
