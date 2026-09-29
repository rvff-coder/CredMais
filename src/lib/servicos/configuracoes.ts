import 'server-only'

import { cache } from 'react'

import type { Limiares } from '@/lib/financeiro/emprestimo'
import { mensagemDeErro } from '@/lib/erros'
import { obterSessao } from '@/lib/servicos/sessao'
import type { ClienteSupabase } from '@/lib/supabase/server'
import type { Configuracoes, HistoricoRegra } from '@/lib/tipos'

const PADRAO: Configuracoes = {
  limiar_diario: 35,
  limiar_semanal: 40,
  limiar_mensal: 50,
  nome_sistema: 'CredMais',
  razao_social: '',
  cnpj_negocio: '',
  telefone_negocio: '',
  email_negocio: '',
  endereco_negocio: '',
  itens_por_pagina: 20,
  notificar_vencimentos: true,
  notificar_atrasos: true,
  updated_at: '',
}

export const obterConfiguracoes = cache(async (): Promise<Configuracoes> => {
  const { supabase } = await obterSessao()
  const { data } = await supabase.from('configuracoes').select('*').eq('id', 1).maybeSingle()
  return (data as Configuracoes | null) ?? PADRAO
})

export function limiaresDe(config: Configuracoes): Limiares {
  return {
    DIARIO: Number(config.limiar_diario),
    SEMANAL: Number(config.limiar_semanal),
    MENSAL: Number(config.limiar_mensal),
  }
}

export async function atualizarLimiares(supabase: ClienteSupabase, limiares: Limiares) {
  const { error } = await supabase.rpc('atualizar_limiares', {
    p_diario: limiares.DIARIO,
    p_semanal: limiares.SEMANAL,
    p_mensal: limiares.MENSAL,
  })
  return error ? mensagemDeErro(error, 'Não foi possível salvar as regras. Tente novamente.') : null
}

export async function listarHistoricoRegras(supabase: ClienteSupabase, limite = 50): Promise<HistoricoRegra[]> {
  const { data } = await supabase
    .from('vw_historico_regras')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite)
  return (data as HistoricoRegra[] | null) ?? []
}

export type DadosConfiguracoesGerais = Pick<
  Configuracoes,
  | 'nome_sistema'
  | 'razao_social'
  | 'cnpj_negocio'
  | 'telefone_negocio'
  | 'email_negocio'
  | 'endereco_negocio'
  | 'itens_por_pagina'
  | 'notificar_vencimentos'
  | 'notificar_atrasos'
>

export async function salvarConfiguracoesGerais(
  supabase: ClienteSupabase,
  usuarioId: string,
  dados: Partial<DadosConfiguracoesGerais>,
) {
  const { error } = await supabase
    .from('configuracoes')
    .update({ ...dados, updated_by: usuarioId })
    .eq('id', 1)
  return error ? mensagemDeErro(error, 'Não foi possível salvar as configurações. Tente novamente.') : null
}
