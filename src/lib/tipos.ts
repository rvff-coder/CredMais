import type { DataISO } from '@/lib/financeiro/datas'
import type { Modalidade } from '@/lib/financeiro/emprestimo'

/**
 * Formato das linhas como chegam do Supabase. Valores `numeric` vêm como
 * número ou string conforme o tamanho; converta com paraCentavos() antes de
 * fazer conta.
 */
type Numerico = number | string

export type StatusCadastro = 'ATIVO' | 'INATIVO'
export type SituacaoCliente = 'SEM_EMPRESTIMO' | 'ATIVO' | 'EM_ATRASO' | 'FINALIZADO'
export type StatusEmprestimo = 'ATIVO' | 'FINALIZADO'
export type SituacaoEmprestimo = 'ATIVO' | 'EM_ATRASO' | 'FINALIZADO'
export type StatusParcela = 'PENDENTE' | 'PAGO' | 'EM_ATRASO'
export type TipoMovimentacao = 'ENTRADA' | 'SAIDA'
export type CategoriaMovimentacao = 'ADICAO_DE_VALOR' | 'RECEBIMENTO_DE_PARCELA' | 'EMPRESTIMO' | 'ACERTO'
export type TipoEvento =
  | 'CLIENTE_CRIADO'
  | 'CLIENTE_ATUALIZADO'
  | 'CLIENTE_DESATIVADO'
  | 'CLIENTE_REATIVADO'
  | 'EMPRESTIMO_CRIADO'
  | 'PARCELA_PAGA'
  | 'COMPROVANTE_ANEXADO'
  | 'PARCELA_EM_ATRASO'
  | 'EMPRESTIMO_FINALIZADO'
  | 'ACERTO_REALIZADO'
  | 'VALOR_ADICIONADO'

export type Perfil = {
  id: string
  nome: string
  email: string | null
}

export type Cliente = {
  id: string
  nome: string
  cnpj: string
  contato: string
  observacoes: string
  status: StatusCadastro
  data_cadastro: DataISO
  created_at: string
  updated_at: string
}

/** vw_clientes */
export type ClienteResumo = Cliente & {
  emprestimos_ativos: number
  emprestimos_total: number
  valor_ativo: Numerico
  saldo_pendente: Numerico
  parcelas_atrasadas: number
  proximo_vencimento: DataISO | null
  proximo_valor: Numerico | null
  situacao: SituacaoCliente
}

export type Socio = {
  id: string
  nome: string
  telefone: string
  chave_pix: string
  status: StatusCadastro
  created_at: string
  updated_at: string
}

/** vw_emprestimos */
export type EmprestimoResumo = {
  id: string
  codigo: number
  cliente_id: string
  cliente_nome: string
  cliente_cnpj: string
  valor_principal: Numerico
  modalidade: Modalidade
  percentual_limiar: Numerico
  valor_juros: Numerico
  valor_total: Numerico
  quantidade_parcelas: number
  valor_parcela_base: Numerico
  data_emprestimo: DataISO
  data_primeiro_vencimento: DataISO
  status: StatusEmprestimo
  observacoes: string
  finalizado_em: string | null
  created_at: string
  total_pago: Numerico
  total_pendente: Numerico
  parcelas_pagas: number
  parcelas_atrasadas: number
  proximo_vencimento: DataISO | null
  proximo_valor: Numerico | null
  proxima_numero: number | null
  situacao: SituacaoEmprestimo
}

/** vw_parcelas */
export type Parcela = {
  id: string
  emprestimo_id: string
  numero_parcela: number
  valor: Numerico
  data_vencimento: DataISO
  status: StatusParcela
  status_efetivo: StatusParcela
  dias_atraso: number
  data_pagamento: string | null
  comprovante_id: string | null
  usuario_confirmacao_id: string | null
  cliente_id: string
  cliente_nome: string
  quantidade_parcelas: number
  modalidade: Modalidade
  emprestimo_codigo: number
  emprestimo_status: StatusEmprestimo
}

/** vw_movimentacoes */
export type Movimentacao = {
  id: string
  codigo: number
  tipo: TipoMovimentacao
  categoria: CategoriaMovimentacao
  valor: Numerico
  data_referencia: DataISO
  cliente_id: string | null
  emprestimo_id: string | null
  parcela_id: string | null
  descricao: string
  usuario_id: string
  created_at: string
  cliente_nome: string | null
  emprestimo_codigo: number | null
  numero_parcela: number | null
  quantidade_parcelas: number | null
  usuario_nome: string | null
}

/** vw_eventos */
export type Evento = {
  id: string
  cliente_id: string | null
  tipo_evento: TipoEvento
  titulo: string
  descricao: string
  valor: Numerico | null
  emprestimo_id: string | null
  parcela_id: string | null
  comprovante_id: string | null
  usuario_id: string | null
  created_at: string
  usuario_nome: string | null
  modalidade: Modalidade | null
  percentual_limiar: Numerico | null
  quantidade_parcelas: number | null
  emprestimo_codigo: number | null
  numero_parcela: number | null
  data_vencimento: DataISO | null
  parcela_status: StatusParcela | null
}

export type Configuracoes = {
  limiar_diario: Numerico
  limiar_semanal: Numerico
  limiar_mensal: Numerico
  nome_sistema: string
  razao_social: string
  cnpj_negocio: string
  telefone_negocio: string
  email_negocio: string
  endereco_negocio: string
  itens_por_pagina: number
  notificar_vencimentos: boolean
  notificar_atrasos: boolean
  updated_at: string
}

/** vw_historico_regras */
export type HistoricoRegra = {
  id: string
  tipo_regra: Modalidade
  valor_anterior: Numerico
  valor_novo: Numerico
  usuario_nome: string | null
  created_at: string
}

export type Comprovante = {
  id: string
  arquivo: string
  nome_original: string
  tipo: string
  tamanho: number
}

/** Retorno das server actions: a UI mostra `mensagem` ou `erro` num toast. */
export type Resultado<T = null> =
  | { ok: true; mensagem: string; dados?: T }
  | { ok: false; erro: string; campos?: Record<string, string> }

export type Pagina<T> = {
  itens: T[]
  total: number
  pagina: number
  porPagina: number
}
