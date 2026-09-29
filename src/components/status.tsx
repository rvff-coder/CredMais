import { Selo, type TomSelo } from '@/components/ui'
import type {
  CategoriaMovimentacao,
  SituacaoCliente,
  SituacaoEmprestimo,
  StatusCadastro,
  StatusParcela,
} from '@/lib/tipos'

/** Um lugar só para nome e cor de cada status, usado em todas as telas. */

export const SITUACAO_CLIENTE: Record<SituacaoCliente, { rotulo: string; tom: TomSelo }> = {
  SEM_EMPRESTIMO: { rotulo: 'Sem empréstimo', tom: 'cinza' },
  ATIVO: { rotulo: 'Ativo', tom: 'azul' },
  EM_ATRASO: { rotulo: 'Em atraso', tom: 'vermelho' },
  FINALIZADO: { rotulo: 'Finalizado', tom: 'verde' },
}

export const SITUACAO_EMPRESTIMO: Record<SituacaoEmprestimo, { rotulo: string; tom: TomSelo }> = {
  ATIVO: { rotulo: 'Ativo', tom: 'azul' },
  EM_ATRASO: { rotulo: 'Em atraso', tom: 'vermelho' },
  FINALIZADO: { rotulo: 'Finalizado', tom: 'verde' },
}

export const STATUS_PARCELA: Record<StatusParcela, { rotulo: string; tom: TomSelo }> = {
  PENDENTE: { rotulo: 'Pendente', tom: 'ambar' },
  PAGO: { rotulo: 'Pago', tom: 'verde' },
  EM_ATRASO: { rotulo: 'Em atraso', tom: 'vermelho' },
}

export const STATUS_CADASTRO: Record<StatusCadastro, { rotulo: string; tom: TomSelo }> = {
  ATIVO: { rotulo: 'Ativo', tom: 'verde' },
  INATIVO: { rotulo: 'Inativo', tom: 'cinza' },
}

export const CATEGORIA: Record<CategoriaMovimentacao, string> = {
  ADICAO_DE_VALOR: 'Adição de valor',
  RECEBIMENTO_DE_PARCELA: 'Recebimento de parcela',
  EMPRESTIMO: 'Empréstimo',
  ACERTO: 'Acerto',
}

export function SeloSituacaoCliente({ situacao }: { situacao: SituacaoCliente }) {
  const s = SITUACAO_CLIENTE[situacao]
  return <Selo tom={s.tom}>{s.rotulo}</Selo>
}

export function SeloSituacaoEmprestimo({ situacao }: { situacao: SituacaoEmprestimo }) {
  const s = SITUACAO_EMPRESTIMO[situacao]
  return <Selo tom={s.tom}>{s.rotulo}</Selo>
}

export function SeloParcela({ status }: { status: StatusParcela }) {
  const s = STATUS_PARCELA[status]
  return <Selo tom={s.tom}>{s.rotulo}</Selo>
}

export function SeloCadastro({ status }: { status: StatusCadastro }) {
  const s = STATUS_CADASTRO[status]
  return <Selo tom={s.tom}>{s.rotulo}</Selo>
}
