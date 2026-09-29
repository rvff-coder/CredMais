import 'server-only'

import { mensagemDeErro } from '@/lib/erros'
import { limparBusca } from '@/lib/servicos/carteira'
import type { ClienteSupabase } from '@/lib/supabase/server'
import type { ClienteResumo, Evento, Pagina, SituacaoCliente, StatusCadastro } from '@/lib/tipos'

export type FiltroClientes = {
  busca?: string
  status?: StatusCadastro
  situacao?: SituacaoCliente
  pagina?: number
  porPagina?: number
}

export async function listarClientes(
  supabase: ClienteSupabase,
  filtro: FiltroClientes = {},
): Promise<Pagina<ClienteResumo>> {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 20

  let consulta = supabase.from('vw_clientes').select('*', { count: 'exact' })

  if (filtro.status) consulta = consulta.eq('status', filtro.status)
  if (filtro.situacao) consulta = consulta.eq('situacao', filtro.situacao)

  if (filtro.busca) {
    const termo = limparBusca(filtro.busca)
    // CNPJ é gravado sem pontuação: "12.345" também precisa achar "12345…".
    const cnpj = termo.toUpperCase().replace(/[^0-9A-Z]/g, '')
    const condicoes = [`nome.ilike.%${termo}%`, `contato.ilike.%${termo}%`]
    if (cnpj.length >= 2) condicoes.push(`cnpj.ilike.%${cnpj}%`)
    if (termo) consulta = consulta.or(condicoes.join(','))
  }

  const { data, count } = await consulta
    .order('nome', { ascending: true })
    .range((pagina - 1) * porPagina, pagina * porPagina - 1)

  return { itens: (data as ClienteResumo[] | null) ?? [], total: count ?? 0, pagina, porPagina }
}

export async function obterCliente(supabase: ClienteSupabase, id: string): Promise<ClienteResumo | null> {
  const { data } = await supabase.from('vw_clientes').select('*').eq('id', id).maybeSingle()
  return (data as ClienteResumo | null) ?? null
}

/** Clientes ativos, para o seletor do empréstimo. */
export async function listarClientesParaSelecao(supabase: ClienteSupabase) {
  const { data } = await supabase
    .from('clientes')
    .select('id, nome, cnpj')
    .eq('status', 'ATIVO')
    .order('nome')
    .limit(1000)
  return (data as { id: string; nome: string; cnpj: string }[] | null) ?? []
}

export type DadosCliente = {
  nome: string
  cnpj: string
  contato: string
  observacoes: string
}

export async function criarCliente(
  supabase: ClienteSupabase,
  dados: DadosCliente,
): Promise<{ id: string } | { erro: string }> {
  const { data, error } = await supabase.from('clientes').insert(dados).select('id').single()
  if (error) return { erro: mensagemDeErro(error, 'Não foi possível cadastrar o cliente. Tente novamente.') }
  return { id: (data as { id: string }).id }
}

export async function atualizarCliente(supabase: ClienteSupabase, id: string, dados: DadosCliente) {
  const { error } = await supabase.from('clientes').update(dados).eq('id', id)
  return error ? mensagemDeErro(error, 'Não foi possível salvar o cliente. Tente novamente.') : null
}

export async function alterarStatusCliente(supabase: ClienteSupabase, id: string, status: StatusCadastro) {
  const { error } = await supabase.from('clientes').update({ status }).eq('id', id)
  return error ? mensagemDeErro(error, 'Não foi possível alterar o status do cliente.') : null
}

/** Timeline do cliente, do mais recente para o mais antigo, em páginas. */
export async function listarEventosCliente(
  supabase: ClienteSupabase,
  clienteId: string,
  limite = 30,
): Promise<{ eventos: Evento[]; temMais: boolean }> {
  const { data } = await supabase
    .from('vw_eventos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limite + 1)

  const eventos = (data as Evento[] | null) ?? []
  return { eventos: eventos.slice(0, limite), temMais: eventos.length > limite }
}
