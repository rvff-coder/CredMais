'use server'

import type { Centavos } from '@/lib/financeiro/dinheiro'
import type { DataISO } from '@/lib/financeiro/datas'
import { adicionarNaCarteira, registrarAcerto } from '@/lib/servicos/carteira'
import { sessaoDaAcao } from '@/lib/servicos/sessao'
import type { Resultado } from '@/lib/tipos'

import { SESSAO_EXPIRADA, atualizarTelas, ehUuid, texto, validarCentavos, validarDataOperacao } from './comum'

type EntradaValor = { valor: Centavos; data: DataISO; observacao: string }

export async function adicionarValor(entrada: EntradaValor): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  if (!validarCentavos(entrada?.valor)) return { ok: false, erro: 'Informe um valor maior que zero.' }
  if (!validarDataOperacao(entrada.data)) return { ok: false, erro: 'Informe uma data válida, que não esteja no futuro.' }

  const erro = await adicionarNaCarteira(sessao.supabase, entrada.valor, entrada.data, texto(entrada.observacao, 500))
  if (erro) return { ok: false, erro }

  atualizarTelas()
  return { ok: true, mensagem: 'Valor adicionado à carteira.' }
}

export async function fazerAcerto(entrada: EntradaValor & { clienteId: string }): Promise<Resultado> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  if (!ehUuid(entrada?.clienteId)) return { ok: false, erro: 'Cliente não encontrado.' }
  if (!validarCentavos(entrada.valor)) return { ok: false, erro: 'Informe um valor maior que zero.' }
  if (!validarDataOperacao(entrada.data)) return { ok: false, erro: 'Informe uma data válida, que não esteja no futuro.' }

  const erro = await registrarAcerto(
    sessao.supabase,
    entrada.clienteId,
    entrada.valor,
    entrada.data,
    texto(entrada.observacao, 500),
  )
  if (erro) return { ok: false, erro }

  atualizarTelas()
  return { ok: true, mensagem: 'Acerto realizado.' }
}
