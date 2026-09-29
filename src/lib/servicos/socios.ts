import 'server-only'

import { mensagemDeErro } from '@/lib/erros'
import { limparBusca } from '@/lib/servicos/carteira'
import type { ClienteSupabase } from '@/lib/supabase/server'
import type { Pagina, Socio, StatusCadastro } from '@/lib/tipos'

export type DadosSocio = { nome: string; telefone: string; chave_pix: string }

export async function listarSocios(
  supabase: ClienteSupabase,
  filtro: { busca?: string; status?: StatusCadastro; pagina?: number; porPagina?: number } = {},
): Promise<Pagina<Socio>> {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 20

  let consulta = supabase.from('socios').select('*', { count: 'exact' })
  if (filtro.status) consulta = consulta.eq('status', filtro.status)
  if (filtro.busca) {
    const termo = limparBusca(filtro.busca)
    if (termo) {
      consulta = consulta.or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%,chave_pix.ilike.%${termo}%`)
    }
  }

  const { data, count } = await consulta
    .order('status', { ascending: true })
    .order('nome')
    .range((pagina - 1) * porPagina, pagina * porPagina - 1)

  return { itens: (data as Socio[] | null) ?? [], total: count ?? 0, pagina, porPagina }
}

export async function criarSocio(supabase: ClienteSupabase, dados: DadosSocio) {
  const { error } = await supabase.from('socios').insert(dados)
  return error ? mensagemDeErro(error, 'Não foi possível cadastrar o sócio. Tente novamente.') : null
}

export async function atualizarSocio(supabase: ClienteSupabase, id: string, dados: DadosSocio) {
  const { error } = await supabase.from('socios').update(dados).eq('id', id)
  return error ? mensagemDeErro(error, 'Não foi possível salvar o sócio. Tente novamente.') : null
}

export async function alterarStatusSocio(supabase: ClienteSupabase, id: string, status: StatusCadastro) {
  const { error } = await supabase.from('socios').update({ status }).eq('id', id)
  return error ? mensagemDeErro(error, 'Não foi possível alterar o status do sócio.') : null
}
