'use server'

import { anexarComprovante, registrarPagamento, type ResultadoRecebimento } from '@/lib/servicos/pagamentos'
import { sessaoDaAcao } from '@/lib/servicos/sessao'
import type { Resultado } from '@/lib/tipos'

import { SESSAO_EXPIRADA, atualizarTelas, ehUuid } from './comum'

function arquivoDo(dados: FormData): File | null {
  const a = dados.get('comprovante')
  return a instanceof File && a.size > 0 ? a : null
}

/** "Recebido 💵": marca a parcela como paga e devolve o valor à carteira. */
export async function receberParcela(dados: FormData): Promise<Resultado<ResultadoRecebimento>> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  const parcelaId = dados.get('parcelaId')
  if (!ehUuid(parcelaId)) return { ok: false, erro: 'Parcela não encontrada.' }

  const r = await registrarPagamento(sessao.supabase, parcelaId, arquivoDo(dados))
  if ('erro' in r) return { ok: false, erro: r.erro }

  atualizarTelas()
  return {
    ok: true,
    mensagem: r.dados.finalizado ? 'Pagamento confirmado. Empréstimo finalizado!' : 'Pagamento confirmado.',
    dados: r.dados,
  }
}

export async function anexarComprovanteAcao(dados: FormData): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  const parcelaId = dados.get('parcelaId')
  if (!ehUuid(parcelaId)) return { ok: false, erro: 'Parcela não encontrada.' }
  const arquivo = arquivoDo(dados)
  if (!arquivo) return { ok: false, erro: 'Selecione o arquivo do comprovante.' }

  const erro = await anexarComprovante(sessao.supabase, parcelaId, arquivo)
  if (erro) return { ok: false, erro }

  atualizarTelas()
  return { ok: true, mensagem: 'Comprovante anexado.' }
}
