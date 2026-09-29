/**
 * Tradução de erros do banco para mensagens de gente.
 *
 * As funções do Postgres levantam códigos curtos (raise exception
 * 'SALDO_INSUFICIENTE'). Aqui eles viram frases; qualquer coisa que não
 * esteja na lista vira a mensagem genérica da operação, para que detalhes
 * técnicos nunca cheguem à tela.
 */

const MENSAGENS: Record<string, string> = {
  NAO_AUTENTICADO: 'Sua sessão expirou. Entre novamente.',
  VALOR_INVALIDO: 'Informe um valor maior que zero, com até duas casas decimais.',
  VALOR_MUITO_ALTO: 'O valor informado é alto demais.',
  VALOR_MINIMO_EMPRESTIMO: 'O valor mínimo de um empréstimo é R$ 10,00.',
  DATA_INVALIDA: 'Informe uma data válida, que não esteja no futuro.',
  MODALIDADE_INVALIDA: 'Escolha a modalidade do empréstimo.',
  CLIENTE_NAO_ENCONTRADO: 'Cliente não encontrado.',
  CLIENTE_INATIVO: 'Este cliente está desativado. Reative o cadastro para emprestar.',
  LIMIAR_ALTERADO: 'As regras de juros mudaram enquanto você preenchia. Revise o resumo e confirme de novo.',
  SALDO_INSUFICIENTE: 'Saldo insuficiente na carteira.',
  ERRO_ARREDONDAMENTO: 'Não foi possível fechar o cálculo das parcelas. Tente novamente.',
  PARCELA_NAO_ENCONTRADA: 'Parcela não encontrada.',
  PARCELA_JA_PAGA: 'Esta parcela já foi recebida.',
  PARCELA_FORA_DE_ORDEM: 'Existe uma parcela anterior em aberto. Receba as parcelas na ordem.',
  AGUARDANDO_VENCIMENTO: 'Esta parcela ainda não venceu. Aguarde a data de vencimento.',
  EMPRESTIMO_FINALIZADO: 'Este empréstimo já foi finalizado.',
  PARCELA_NAO_PAGA: 'O comprovante só pode ser anexado a uma parcela já recebida.',
  COMPROVANTE_EXISTENTE: 'Esta parcela já possui comprovante.',
  PERCENTUAL_INVALIDO: 'Os percentuais devem estar entre 0% e 1000%, com até duas casas decimais.',
  MOVIMENTACAO_IMUTAVEL: 'Movimentações da carteira não podem ser alteradas.',
}

type ErroBanco = { message?: string; code?: string; details?: string } | null | undefined

/** Mensagem para o usuário a partir do erro do Supabase. */
export function mensagemDeErro(erro: ErroBanco, generica: string): string {
  if (!erro) return generica
  const codigo = (erro.message ?? '').trim()
  if (MENSAGENS[codigo]) return MENSAGENS[codigo]

  // Violação de unicidade: o índice de uma parcela, uma entrada.
  if (erro.code === '23505') {
    if (/movimentacoes_um_recebimento_por_parcela/.test(erro.message ?? '')) {
      return MENSAGENS.PARCELA_JA_PAGA
    }
    if (/clientes_cnpj_key/.test(erro.message ?? '')) {
      return 'Já existe um cliente cadastrado com este CNPJ.'
    }
  }
  if (erro.code === '23514' && /cnpj/.test(erro.message ?? '')) {
    return 'CNPJ inválido.'
  }
  if (erro.code === 'PGRST301' || erro.code === '42501') {
    return 'Você não tem permissão para esta operação. Entre novamente.'
  }

  return generica
}

export function codigoDoErro(erro: ErroBanco): string | null {
  const codigo = (erro?.message ?? '').trim()
  return MENSAGENS[codigo] ? codigo : null
}
