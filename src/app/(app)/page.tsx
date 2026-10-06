import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarCheck2, Coins, HandCoins, TrendingUp, Wallet } from 'lucide-react'

import { Cabecalho } from '@/components/casca/cabecalho'
import { GraficoMovimentacoes } from '@/components/grafico-movimentacoes'
import { ItemMovimentacao } from '@/components/movimentacoes'
import { Abas } from '@/components/navegacao'
import { BotaoAdicionarValor } from '@/components/operacoes/carteira'
import { BotaoEmprestar } from '@/components/operacoes/emprestar'
import { BotaoPagamento } from '@/components/operacoes/pagamento'
import { SeloParcela } from '@/components/status'
import { Avatar, Cartao, EstadoVazio, Pilula, TituloSecao, cx } from '@/components/ui'
import { formatarMoeda, paraCentavos } from '@/lib/financeiro/dinheiro'
import { formatarData, formatarHora, hojeBR } from '@/lib/financeiro/datas'
import { PERIODOS, intervaloDoPeriodo, lerPeriodo } from '@/lib/financeiro/periodo'
import { listarMovimentacoes, obterSerie } from '@/lib/servicos/carteira'
import { listarPagamentosDeHoje, listarParcelasEmAtraso, obterResumoPainel } from '@/lib/servicos/painel'
import { exigirSessao } from '@/lib/servicos/sessao'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function PaginaDashboard({ searchParams }: PageProps<'/'>) {
  const { supabase } = await exigirSessao()
  const params = await searchParams
  const periodo = lerPeriodo(params.periodo)
  const intervalo = intervaloDoPeriodo(periodo)
  const hoje = hojeBR()

  const [resumo, pagamentosHoje, atrasadas, ultimas, serie] = await Promise.all([
    obterResumoPainel(supabase),
    listarPagamentosDeHoje(supabase),
    listarParcelasEmAtraso(supabase, 8),
    listarMovimentacoes(supabase, { porPagina: 7 }),
    obterSerie(supabase, intervalo.inicio, intervalo.fim, intervalo.agrupar),
  ])

  const aReceberHoje = pagamentosHoje.filter((p) => p.status !== 'PAGO').reduce((s, p) => s + paraCentavos(p.valor), 0)

  return (
    <>
      <Cabecalho
        titulo="Dashboard"
        descricao={`Visão geral da operação · ${formatarData(hoje)}`}
        acoes={
          <>
            <BotaoEmprestar />
            <BotaoAdicionarValor saldo={paraCentavos(resumo.carteira)} />
          </>
        }
      />

      <div className="space-y-6 px-4 pt-4 pb-10 sm:px-6 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
          <CartaoIndicador
            destaque
            icone={Wallet}
            rotulo="Carteira"
            valor={formatarMoeda(paraCentavos(resumo.carteira))}
            sub="Disponível para novos empréstimos"
            href="/carteira"
          />
          <CartaoIndicador
            icone={HandCoins}
            rotulo="Total emprestado"
            valor={formatarMoeda(paraCentavos(resumo.total_emprestado))}
            sub={`${resumo.emprestimos_ativos} ${resumo.emprestimos_ativos === 1 ? 'empréstimo ativo' : 'empréstimos ativos'}`}
            href="/emprestimos?situacao=ATIVO"
          />
          <CartaoIndicador
            icone={TrendingUp}
            rotulo="Total a receber"
            valor={formatarMoeda(paraCentavos(resumo.total_a_receber))}
            sub="Parcelas futuras dos empréstimos ativos"
          />
          <CartaoIndicador
            icone={Coins}
            rotulo="Recebido hoje"
            valor={formatarMoeda(paraCentavos(resumo.recebido_hoje))}
            sub={`${resumo.recebimentos_hoje} ${resumo.recebimentos_hoje === 1 ? 'recebimento' : 'recebimentos'} hoje`}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div className="min-w-0 space-y-6">
            <Cartao className="p-5">
              <TituloSecao
                acao={
                  aReceberHoje > 0 && (
                    <span className="numeros text-xs text-tinta-3">
                      A receber hoje: <strong className="text-tinta">{formatarMoeda(aReceberHoje)}</strong>
                    </span>
                  )
                }
              >
                Pagamentos de hoje
              </TituloSecao>
              {pagamentosHoje.length === 0 ? (
                <EstadoVazio
                  icone={<CalendarCheck2 className="size-5" />}
                  titulo="Nenhuma parcela vence hoje."
                  descricao="Quando houver parcelas com vencimento no dia, elas aparecem aqui."
                  className="py-10"
                />
              ) : (
                <ul className="mt-3 divide-y divide-borda">
                  {pagamentosHoje.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                      <Link href={`/clientes?c=${p.cliente_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar nome={p.cliente_nome} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium hover:text-azul-claro">{p.cliente_nome}</span>
                          <span className="block text-xs text-tinta-3">
                            Parcela {p.numero_parcela}/{p.quantidade_parcelas}
                          </span>
                        </span>
                      </Link>
                      <Pilula>
                        {p.data_pagamento ? `Pago às ${formatarHora(p.data_pagamento)}` : formatarData(p.data_vencimento)}
                      </Pilula>
                      <span className="numeros w-24 text-right text-sm font-semibold">{formatarMoeda(paraCentavos(p.valor))}</span>
                      <span className="w-20">
                        <SeloParcela status={p.status_efetivo} />
                      </span>
                      <span className="flex w-full justify-end sm:w-auto">
                        {p.status !== 'PAGO' && p.emprestimo_status === 'ATIVO' && (
                          <BotaoPagamento
                            tamanho="sm"
                            hoje={hoje}
                            parcela={{
                              id: p.id,
                              numero: p.numero_parcela,
                              total: p.quantidade_parcelas,
                              valor: paraCentavos(p.valor),
                              vencimento: p.data_vencimento,
                              status: p.status_efetivo,
                              clienteNome: p.cliente_nome,
                              emprestimoCodigo: p.emprestimo_codigo,
                            }}
                          />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>

            <Cartao className="p-5">
              <TituloSecao
                acao={
                  atrasadas.total > atrasadas.itens.length && (
                    <Link href="/emprestimos?situacao=EM_ATRASO" className="text-xs font-medium text-azul-claro hover:underline">
                      Ver todas ({atrasadas.total})
                    </Link>
                  )
                }
              >
                <span className="flex items-center gap-2">
                  Parcelas em atraso
                  {atrasadas.total > 0 && (
                    <span className="numeros rounded-full bg-vermelho-fundo px-2 py-0.5 text-[11px] font-semibold text-vermelho">
                      {atrasadas.total}
                    </span>
                  )}
                </span>
              </TituloSecao>
              {atrasadas.itens.length === 0 ? (
                <EstadoVazio
                  icone={<CalendarCheck2 className="size-5" />}
                  titulo="Nenhuma parcela em atraso."
                  descricao="Tudo em dia por aqui."
                  className="py-10"
                />
              ) : (
                <>
                {/* Celular: lista em vez de tabela, sem rolagem lateral. */}
                <ul className="mt-3 divide-y divide-borda sm:hidden">
                  {atrasadas.itens.map((p) => (
                    <li key={p.id}>
                      <Link href={`/clientes/${p.cliente_id}`} className="flex items-center gap-3 py-3">
                        <Avatar nome={p.cliente_nome} tamanho="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.cliente_nome}</span>
                          <span className="numeros block text-xs text-tinta-3">
                            Parcela {p.numero_parcela}/{p.quantidade_parcelas} · venceu {formatarData(p.data_vencimento)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="numeros block text-sm font-semibold">{formatarMoeda(paraCentavos(p.valor))}</span>
                          <span className="numeros block text-xs font-medium text-vermelho">
                            {p.dias_atraso} {p.dias_atraso === 1 ? 'dia' : 'dias'}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-medium tracking-wide text-tinta-4 uppercase">
                        <th className="pb-2 font-medium">Cliente</th>
                        <th className="pb-2 font-medium">Parcela</th>
                        <th className="pb-2 font-medium">Vencimento</th>
                        <th className="pb-2 text-right font-medium">Atraso</th>
                        <th className="pb-2 text-right font-medium">Valor</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borda">
                      {atrasadas.itens.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-3">
                            <span className="flex items-center gap-2.5">
                              <Avatar nome={p.cliente_nome} tamanho="sm" />
                              <span className="truncate font-medium">{p.cliente_nome}</span>
                            </span>
                          </td>
                          <td className="numeros py-2.5 pr-3 text-tinta-2">
                            {p.numero_parcela}/{p.quantidade_parcelas}
                          </td>
                          <td className="numeros py-2.5 pr-3 text-tinta-2">{formatarData(p.data_vencimento)}</td>
                          <td className="numeros py-2.5 pr-3 text-right font-medium text-vermelho">
                            {p.dias_atraso} {p.dias_atraso === 1 ? 'dia' : 'dias'}
                          </td>
                          <td className="numeros py-2.5 pr-3 text-right font-semibold">{formatarMoeda(paraCentavos(p.valor))}</td>
                          <td className="py-2.5 text-right">
                            <Link
                              href={`/clientes/${p.cliente_id}`}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-azul-claro hover:bg-azul-fundo"
                            >
                              Abrir cliente <ArrowRight className="size-3" aria-hidden />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </Cartao>
          </div>

          <Cartao className="h-fit p-5">
            <TituloSecao
              acao={
                <Link href="/carteira" className="text-xs font-medium text-azul-claro hover:underline">
                  Ver extrato
                </Link>
              }
            >
              Últimas movimentações
            </TituloSecao>
            {ultimas.itens.length === 0 ? (
              <EstadoVazio
                icone={<Wallet className="size-5" />}
                titulo="Nenhuma movimentação registrada."
                descricao="Adicione um valor à carteira para começar."
                className="py-10"
              />
            ) : (
              <div className="mt-2 -mx-2">
                {ultimas.itens.map((m) => (
                  <ItemMovimentacao key={m.id} m={m} />
                ))}
              </div>
            )}
          </Cartao>
        </div>

        <Cartao className="p-5">
          <TituloSecao acao={<Abas nome="periodo" padrao="30d" opcoes={PERIODOS} />}>Resumo financeiro</TituloSecao>
          <ResumoPeriodo serie={serie} />
          <div className="mt-4">
            <GraficoMovimentacoes pontos={serie} agrupar={intervalo.agrupar} />
          </div>
        </Cartao>

        {resumo.parcelas_atrasadas > 0 && (
          <p className="flex items-center gap-2 text-xs text-tinta-3">
            <AlertTriangle className="size-3.5 text-vermelho" aria-hidden />
            Parcelas vencidas e não pagas são marcadas como “Em atraso” automaticamente.
          </p>
        )}
      </div>
    </>
  )
}

function ResumoPeriodo({ serie }: { serie: { entradas: number; saidas: number }[] }) {
  const entradas = serie.reduce((s, p) => s + paraCentavos(p.entradas), 0)
  const saidas = serie.reduce((s, p) => s + paraCentavos(p.saidas), 0)
  const saldo = entradas - saidas
  return (
    // No celular, três colunas cortavam os valores ("R$ 15.0…"): vira uma linha por item.
    <dl className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
      {[
        { rotulo: 'Entradas', valor: formatarMoeda(entradas) },
        { rotulo: 'Saídas', valor: formatarMoeda(saidas) },
        { rotulo: 'Resultado', valor: `${saldo < 0 ? '- ' : ''}${formatarMoeda(Math.abs(saldo))}` },
      ].map((d) => (
        <div
          key={d.rotulo}
          className="flex items-baseline justify-between gap-3 rounded-xl border border-borda bg-painel-2 px-3 py-2.5 sm:block"
        >
          <dt className="text-[11px] text-tinta-3">{d.rotulo}</dt>
          <dd className="numeros truncate text-sm font-semibold sm:mt-0.5 sm:text-base">{d.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function CartaoIndicador({
  icone: Icone,
  rotulo,
  valor,
  sub,
  href,
  destaque,
}: {
  icone: typeof Wallet
  rotulo: string
  valor: string
  sub: string
  href?: string
  destaque?: boolean
}) {
  const conteudo = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-tinta-3 uppercase">{rotulo}</span>
        <span
          className={cx(
            'grid size-8 place-items-center rounded-xl',
            destaque ? 'bg-azul text-white' : 'bg-painel-3 text-tinta-2',
          )}
        >
          <Icone className="size-4" aria-hidden />
        </span>
      </div>
      <p className="numeros mt-3 truncate text-2xl font-semibold tracking-tight sm:text-[26px]">{valor}</p>
      <p className="mt-1 truncate text-xs text-tinta-3">{sub}</p>
    </>
  )

  const classe = cx(
    'relative overflow-hidden rounded-cartao border p-5 transition-colors',
    destaque
      ? 'border-azul/30 bg-[radial-gradient(120%_120%_at_0%_0%,rgb(47_123_245/0.22),transparent_60%)] bg-painel'
      : 'border-borda bg-painel',
    href && 'hover:border-borda-forte',
  )

  return href ? (
    <Link href={href} className={cx(classe, 'block')}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}
