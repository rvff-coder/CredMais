'use server'

import { paraCentavos, type Centavos } from '@/lib/financeiro/dinheiro'
import { hojeBR, type DataISO } from '@/lib/financeiro/datas'
import { ehModalidade, type Limiares, type Modalidade } from '@/lib/financeiro/emprestimo'
import { calcularSaldo } from '@/lib/servicos/carteira'
import { listarClientesParaSelecao } from '@/lib/servicos/clientes'
import { limiaresDe } from '@/lib/servicos/configuracoes'
import { criarEmprestimo } from '@/lib/servicos/emprestimos'
import { sessaoDaAcao } from '@/lib/servicos/sessao'
import type { Configuracoes, Resultado } from '@/lib/tipos'

import {
  SESSAO_EXPIRADA,
  atualizarTelas,
  ehUuid,
  texto,
  validarDataOperacao,
  validarValorEmprestimo,
} from './comum'

export type DadosParaEmprestimo = {
  saldo: Centavos
  limiares: Limiares
  hoje: DataISO
  clientes: { id: string; nome: string; cnpj: string }[]
}

/**
 * Dados frescos no momento em que o modal abre: saldo e limiar mudam com o
 * uso, então não vale a pena trazê-los junto com a página.
 */
export async function carregarDadosParaEmprestimo(incluirClientes: boolean): Promise<DadosParaEmprestimo | null> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return null
  const { supabase } = sessao

  const [saldo, config, clientes] = await Promise.all([
    calcularSaldo(supabase),
    supabase.from('configuracoes').select('*').eq('id', 1).single(),
    incluirClientes ? listarClientesParaSelecao(supabase) : Promise.resolve([]),
  ])

  return {
    saldo: paraCentavos(saldo),
    limiares: limiaresDe(config.data as Configuracoes),
    hoje: hojeBR(),
    clientes,
  }
}

export type EntradaEmprestimo = {
  clienteId: string
  valor: Centavos
  modalidade: Modalidade
  data: DataISO
  observacao: string
  limiarEsperado: number
}

export type FalhaSaldo = { saldo: Centavos; solicitado: Centavos }

export async function confirmarEmprestimo(
  entrada: EntradaEmprestimo,
): Promise<Resultado<{ id: string }> & { saldoInsuficiente?: FalhaSaldo; limiarAlterado?: boolean }> {
  const sessao = await sessaoDaAcao()
  if (!sessao) return { ok: false, erro: SESSAO_EXPIRADA }

  if (!ehUuid(entrada?.clienteId)) return { ok: false, erro: 'Selecione o cliente.' }
  const erroValor = validarValorEmprestimo(entrada.valor)
  if (erroValor) return { ok: false, erro: erroValor }
  if (!ehModalidade(entrada.modalidade)) return { ok: false, erro: 'Escolha a modalidade do empréstimo.' }
  if (!validarDataOperacao(entrada.data)) return { ok: false, erro: 'Informe uma data válida, que não esteja no futuro.' }
  if (typeof entrada.limiarEsperado !== 'number' || entrada.limiarEsperado < 0) {
    return { ok: false, erro: 'Não foi possível identificar o limiar. Abra o empréstimo novamente.' }
  }

  const r = await criarEmprestimo(sessao.supabase, {
    clienteId: entrada.clienteId,
    principal: entrada.valor,
    modalidade: entrada.modalidade,
    data: entrada.data,
    observacao: texto(entrada.observacao, 2000),
    limiarEsperado: entrada.limiarEsperado,
  })

  if ('erro' in r) {
    if (r.codigo === 'SALDO_INSUFICIENTE') {
      const saldo = paraCentavos(await calcularSaldo(sessao.supabase))
      return { ok: false, erro: r.erro, saldoInsuficiente: { saldo, solicitado: entrada.valor } }
    }
    return { ok: false, erro: r.erro, limiarAlterado: r.codigo === 'LIMIAR_ALTERADO' }
  }

  atualizarTelas()
  return { ok: true, mensagem: 'Empréstimo criado com sucesso.', dados: { id: r.id } }
}
