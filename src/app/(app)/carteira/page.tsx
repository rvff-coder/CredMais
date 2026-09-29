import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from 'lucide-react'

import { Cabecalho } from '@/components/casca/cabecalho'
import { GraficoMovimentacoes } from '@/components/grafico-movimentacoes'
import { tituloMovimentacao } from '@/components/movimentacoes'
import { Abas, BarraBusca, Filtros, Paginacao } from '@/components/navegacao'
import { BotaoAdicionarValor } from '@/components/operacoes/carteira'
import { CATEGORIA } from '@/components/status'
import { Cartao, EstadoVazio, TituloSecao, cx } from '@/components/ui'
import { formatarMoeda, formatarMoedaComSinal, paraCentavos } from '@/lib/financeiro/dinheiro'
import { diaDoInstante, formatarData, formatarHora } from '@/lib/financeiro/datas'
import { PERIODOS, intervaloDoPeriodo, lerPeriodo } from '@/lib/financeiro/periodo'
import { listarMovimentacoes, obterResumoCarteira, obterSerie, type FiltroExtrato } from '@/lib/servicos/carteira'
import { obterConfiguracoes } from '@/lib/servicos/configuracoes'
import { exigirSessao } from '@/lib/servicos/sessao'

export const metadata: Metadata = { title: 'Carteira' }

const FILTROS: Record<string, Pick<FiltroExtrato, 'tipo' | 'categoria'>> = {
  entrada: { tipo: 'ENTRADA' },
  saida: { tipo: 'SAIDA' },
  emprestimo: { categoria: 'EMPRESTIMO' },
  parcela: { categoria: 'RECEBIMENTO_DE_PARCELA' },
  acerto: { categoria: 'ACERTO' },
  adicao: { categoria: 'ADICAO_DE_VALOR' },
}

export default async function PaginaCarteira({ searchParams }: PageProps<'/carteira'>) {
  const { supabase } = await exigirSessao()
  const params = await searchParams
  const config = await obterConfiguracoes()

  const periodo = lerPeriodo(params.periodo)
  const intervalo = intervaloDoPeriodo(periodo)
  const filtro = typeof params.filtro === 'string' ? FILTROS[params.filtro] : undefined
  const busca = typeof params.q === 'string' ? params.q : undefined
  const pagina = Number(params.p) > 0 ? Number(params.p) : 1

  const [resumo, serie, extrato] = await Promise.all([
    obterResumoCarteira(supabase, intervalo.inicio, intervalo.fim),
    obterSerie(supabase, intervalo.inicio, intervalo.fim, intervalo.agrupar),
    listarMovimentacoes(supabase, { ...filtro, busca, pagina, porPagina: config.itens_por_pagina }),
  ])

  const rotuloPeriodo = PERIODOS.find((p) => p.valor === periodo)?.rotulo ?? ''
  const saldo = paraCentavos(resumo.saldo)

  return (
    <>
      <Cabecalho
        titulo="Carteira"
        descricao="Livro-caixa: o saldo é a soma de todas as entradas menos todas as saídas."
        acoes={<BotaoAdicionarValor saldo={saldo} />}
      />

      <div className="space-y-6 px-4 pt-4 pb-10 sm:px-6 lg:px-8">
        <section className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]" aria-label="Resumo da carteira">
          <div className="relative overflow-hidden rounded-cartao border border-azul/30 bg-painel bg-[radial-gradient(120%_140%_at_0%_0%,rgb(47_123_245/0.25),transparent_60%)] p-6">
            <p className="text-[11px] font-semibold tracking-wider text-tinta-3 uppercase">Saldo atual</p>
            <p className="numeros mt-3 text-4xl font-semibold tracking-tight">{formatarMoeda(saldo)}</p>
            <p className="mt-2 text-xs text-tinta-3">Disponível para novos empréstimos</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniCartao rotulo="Total de entradas" valor={paraCentavos(resumo.total_entradas)} entrada />
            <MiniCartao rotulo="Total de saídas" valor={paraCentavos(resumo.total_saidas)} />
            <MiniCartao rotulo={`Entradas · ${rotuloPeriodo}`} valor={paraCentavos(resumo.entradas_periodo)} entrada />
            <MiniCartao rotulo={`Saídas · ${rotuloPeriodo}`} valor={paraCentavos(resumo.saidas_periodo)} />
          </div>
        </section>

        <Cartao className="p-5">
          <TituloSecao acao={<Abas nome="periodo" padrao="30d" opcoes={PERIODOS} />}>Movimentações</TituloSecao>
          <div className="mt-4">
            <GraficoMovimentacoes pontos={serie} agrupar={intervalo.agrupar} />
          </div>
        </Cartao>

        <Cartao className="overflow-hidden">
          <div className="space-y-3 p-5 pb-3">
            <TituloSecao>
              <span className="numeros">
                Extrato <span className="ml-1 text-xs font-normal text-tinta-3">{extrato.total} lançamentos</span>
              </span>
            </TituloSecao>
            <BarraBusca placeholder="Buscar por descrição, cliente, usuário ou nº" className="max-w-md" />
            <Filtros
              nome="filtro"
              opcoes={[
                { valor: 'entrada', rotulo: 'Entrada' },
                { valor: 'saida', rotulo: 'Saída' },
                { valor: 'emprestimo', rotulo: 'Empréstimo' },
                { valor: 'parcela', rotulo: 'Parcela' },
                { valor: 'acerto', rotulo: 'Acerto' },
                { valor: 'adicao', rotulo: 'Adição manual' },
              ]}
            />
          </div>

          {extrato.itens.length === 0 ? (
            <EstadoVazio
              icone={<ReceiptText className="size-5" />}
              titulo="Nenhuma movimentação registrada."
              descricao={filtro || busca ? 'Nada encontrado com esses filtros.' : 'Adicione um valor à carteira para começar.'}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-borda text-left text-[11px] font-medium tracking-wide text-tinta-4 uppercase">
                      <th className="px-5 py-2.5 font-medium">ID</th>
                      <th className="px-3 py-2.5 font-medium">Data</th>
                      <th className="px-3 py-2.5 font-medium">Hora</th>
                      <th className="px-3 py-2.5 font-medium">Tipo</th>
                      <th className="px-3 py-2.5 font-medium">Categoria</th>
                      <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                      <th className="px-3 py-2.5 font-medium">Cliente</th>
                      <th className="px-3 py-2.5 font-medium">Empréstimo</th>
                      <th className="px-3 py-2.5 font-medium">Parcela</th>
                      <th className="px-3 py-2.5 font-medium">Descrição</th>
                      <th className="px-5 py-2.5 font-medium">Usuário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda">
                    {extrato.itens.map((m) => {
                      const entrada = m.tipo === 'ENTRADA'
                      return (
                        <tr key={m.id} className="transition-colors hover:bg-painel-2">
                          <td className="numeros px-5 py-2.5 text-xs text-tinta-4">#{m.codigo}</td>
                          <td className="numeros px-3 py-2.5 text-tinta-2">
                            {formatarData(diaDoInstante(m.created_at))}
                            {m.data_referencia !== diaDoInstante(m.created_at) && (
                              <span className="block text-[10px] text-tinta-4">ref. {formatarData(m.data_referencia)}</span>
                            )}
                          </td>
                          <td className="numeros px-3 py-2.5 text-tinta-2">{formatarHora(m.created_at)}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cx(
                                'inline-flex items-center gap-1 text-xs font-medium',
                                entrada ? 'text-verde' : 'text-tinta-2',
                              )}
                            >
                              {entrada ? <ArrowDownLeft className="size-3.5" aria-hidden /> : <ArrowUpRight className="size-3.5" aria-hidden />}
                              {entrada ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-tinta-2">{CATEGORIA[m.categoria]}</td>
                          <td className={cx('numeros px-3 py-2.5 text-right font-semibold', entrada ? 'text-verde' : 'text-tinta')}>
                            {formatarMoedaComSinal(paraCentavos(m.valor), entrada ? '+' : '-')}
                          </td>
                          <td className="max-w-40 truncate px-3 py-2.5">
                            {m.cliente_id ? (
                              <Link href={`/clientes/${m.cliente_id}`} className="hover:text-azul-claro">
                                {m.cliente_nome}
                              </Link>
                            ) : (
                              <span className="text-tinta-4">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {m.emprestimo_id ? (
                              <Link href={`/emprestimos/${m.emprestimo_id}`} className="text-azul-claro hover:underline">
                                #{m.emprestimo_codigo}
                              </Link>
                            ) : (
                              <span className="text-tinta-4">—</span>
                            )}
                          </td>
                          <td className="numeros px-3 py-2.5 text-xs text-tinta-2">
                            {m.numero_parcela ? `${m.numero_parcela}/${m.quantidade_parcelas}` : '—'}
                          </td>
                          <td className="max-w-56 truncate px-3 py-2.5 text-xs text-tinta-2" title={m.descricao}>
                            {m.descricao || '—'}
                          </td>
                          <td className="px-5 py-2.5 text-xs text-tinta-3">{m.usuario_nome ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-borda border-t border-borda lg:hidden">
                {extrato.itens.map((m) => {
                  const entrada = m.tipo === 'ENTRADA'
                  return (
                    <li key={m.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{tituloMovimentacao(m)}</p>
                          <p className="truncate text-xs text-tinta-3">
                            {m.cliente_nome ?? m.descricao} · {CATEGORIA[m.categoria]}
                          </p>
                        </div>
                        <span className={cx('numeros shrink-0 text-sm font-semibold', entrada ? 'text-verde' : 'text-tinta')}>
                          {formatarMoedaComSinal(paraCentavos(m.valor), entrada ? '+' : '-')}
                        </span>
                      </div>
                      <p className="numeros mt-1 text-[11px] text-tinta-4">
                        #{m.codigo} · {formatarData(diaDoInstante(m.created_at))} {formatarHora(m.created_at)} ·{' '}
                        {m.usuario_nome ?? '—'}
                        {m.emprestimo_codigo && ` · Empréstimo #${m.emprestimo_codigo}`}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          <div className="px-5 pb-4">
            <Paginacao pagina={extrato.pagina} total={extrato.total} porPagina={extrato.porPagina} />
          </div>
        </Cartao>
      </div>
    </>
  )
}

function MiniCartao({ rotulo, valor, entrada }: { rotulo: string; valor: number; entrada?: boolean }) {
  return (
    <Cartao className="p-4">
      <p className="flex items-center gap-1.5 truncate text-[11px] font-medium text-tinta-3">
        {entrada ? (
          <ArrowDownLeft className="size-3.5 text-verde" aria-hidden />
        ) : (
          <ArrowUpRight className="size-3.5 text-tinta-2" aria-hidden />
        )}
        {rotulo}
      </p>
      <p className="numeros mt-2 truncate text-lg font-semibold">{formatarMoeda(valor)}</p>
    </Cartao>
  )
}
