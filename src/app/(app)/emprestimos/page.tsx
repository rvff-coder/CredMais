import type { Metadata } from 'next'
import Link from 'next/link'
import { HandCoins } from 'lucide-react'

import { Cabecalho } from '@/components/casca/cabecalho'
import { BarraBusca, Filtros, Paginacao } from '@/components/navegacao'
import { BotaoEmprestar } from '@/components/operacoes/emprestar'
import { SeloSituacaoEmprestimo } from '@/components/status'
import { Avatar, Cartao, EstadoVazio, Pilula, cx } from '@/components/ui'
import { formatarMoeda, paraCentavos } from '@/lib/financeiro/dinheiro'
import { formatarData, hojeBR } from '@/lib/financeiro/datas'
import { NOME_MODALIDADE, ehModalidade, formatarPercentual } from '@/lib/financeiro/emprestimo'
import { obterConfiguracoes } from '@/lib/servicos/configuracoes'
import { listarEmprestimos } from '@/lib/servicos/emprestimos'
import { exigirSessao } from '@/lib/servicos/sessao'
import type { SituacaoEmprestimo } from '@/lib/tipos'

export const metadata: Metadata = { title: 'Empréstimos' }

const SITUACOES: SituacaoEmprestimo[] = ['ATIVO', 'EM_ATRASO', 'FINALIZADO']

export default async function PaginaEmprestimos({ searchParams }: PageProps<'/emprestimos'>) {
  const { supabase } = await exigirSessao()
  const params = await searchParams
  const config = await obterConfiguracoes()

  const situacao = SITUACOES.includes(params.situacao as SituacaoEmprestimo) ? (params.situacao as SituacaoEmprestimo) : undefined
  const modalidade = ehModalidade(params.modalidade) ? params.modalidade : undefined
  const busca = typeof params.q === 'string' ? params.q : undefined
  const pagina = Number(params.p) > 0 ? Number(params.p) : 1

  const lista = await listarEmprestimos(supabase, {
    situacao,
    modalidade,
    busca,
    pagina,
    porPagina: config.itens_por_pagina,
  })
  const hoje = hojeBR()
  const filtrando = Boolean(situacao || modalidade || busca)

  return (
    <>
      <Cabecalho
        antesDoTitulo={
          <p className="numeros text-[11px] font-semibold tracking-wider text-tinta-4 uppercase">{lista.total} no total</p>
        }
        titulo="Empréstimos"
        descricao="Todos os empréstimos, com o limiar gravado no momento da criação."
        acoes={<BotaoEmprestar />}
      />

      <div className="space-y-4 px-4 pt-2 pb-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <BarraBusca placeholder="Buscar por cliente ou nº do empréstimo" className="max-w-md" />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Filtros
              nome="situacao"
              rotulo="Status"
              opcoes={[
                { valor: 'ATIVO', rotulo: 'Ativos' },
                { valor: 'FINALIZADO', rotulo: 'Finalizados' },
                { valor: 'EM_ATRASO', rotulo: 'Em atraso' },
              ]}
            />
            <Filtros
              nome="modalidade"
              rotulo="Modalidade"
              opcoes={[
                { valor: 'DIARIO', rotulo: 'Diários' },
                { valor: 'SEMANAL', rotulo: 'Semanais' },
                { valor: 'MENSAL', rotulo: 'Mensais' },
              ]}
            />
          </div>
        </div>

        <Cartao className="overflow-hidden">
          {lista.itens.length === 0 ? (
            <EstadoVazio
              icone={<HandCoins className="size-5" />}
              titulo="Nenhum empréstimo encontrado."
              descricao={filtrando ? 'Tente remover os filtros.' : 'Crie o primeiro empréstimo a partir de um cliente.'}
              acao={!filtrando && <BotaoEmprestar />}
            />
          ) : (
            <>
              {/* Tabela no desktop */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-borda text-left text-[11px] font-medium tracking-wide text-tinta-4 uppercase">
                      <th className="px-5 py-3 font-medium">Cliente</th>
                      <th className="px-3 py-3 text-right font-medium">Principal</th>
                      <th className="px-3 py-3 font-medium">Modalidade</th>
                      <th className="px-3 py-3 text-right font-medium">Limiar</th>
                      <th className="px-3 py-3 text-right font-medium">Juros</th>
                      <th className="px-3 py-3 text-right font-medium">Total</th>
                      <th className="px-3 py-3 text-right font-medium">Pago</th>
                      <th className="px-3 py-3 text-right font-medium">Pendente</th>
                      <th className="px-3 py-3 font-medium">Próx. venc.</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda">
                    {lista.itens.map((e) => (
                      <tr key={e.id} className="group relative transition-colors hover:bg-painel-2">
                        <td className="px-5 py-3">
                          <Link href={`/emprestimos/${e.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                            <Avatar nome={e.cliente_nome} tamanho="sm" />
                            <span className="min-w-0">
                              <span className="block max-w-48 truncate font-medium">{e.cliente_nome}</span>
                              <span className="numeros block text-[11px] text-tinta-4">
                                #{e.codigo} · {formatarData(e.data_emprestimo)}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="numeros px-3 py-3 text-right font-medium">{formatarMoeda(paraCentavos(e.valor_principal))}</td>
                        <td className="px-3 py-3 text-tinta-2">{NOME_MODALIDADE[e.modalidade]}</td>
                        <td className="numeros px-3 py-3 text-right text-tinta-2">{formatarPercentual(e.percentual_limiar)}</td>
                        <td className="numeros px-3 py-3 text-right text-tinta-2">{formatarMoeda(paraCentavos(e.valor_juros))}</td>
                        <td className="numeros px-3 py-3 text-right">{formatarMoeda(paraCentavos(e.valor_total))}</td>
                        <td className="numeros px-3 py-3 text-right text-verde">{formatarMoeda(paraCentavos(e.total_pago))}</td>
                        <td className="numeros px-3 py-3 text-right">{formatarMoeda(paraCentavos(e.total_pendente))}</td>
                        <td className="px-3 py-3">
                          {e.proximo_vencimento ? (
                            <Pilula
                              className={cx(
                                e.proximo_vencimento < hoje && '!bg-vermelho-fundo !text-vermelho',
                                e.proximo_vencimento === hoje && '!bg-azul-fundo !text-azul-claro',
                              )}
                            >
                              {formatarData(e.proximo_vencimento)}
                            </Pilula>
                          ) : (
                            <span className="text-tinta-4">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <SeloSituacaoEmprestimo situacao={e.situacao} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cartões no celular e tablet */}
              <ul className="divide-y divide-borda lg:hidden">
                {lista.itens.map((e) => (
                  <li key={e.id}>
                    <Link href={`/emprestimos/${e.id}`} className="block px-4 py-4 transition-colors hover:bg-painel-2">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <Avatar nome={e.cliente_nome} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{e.cliente_nome}</span>
                            <span className="numeros block text-xs text-tinta-3">
                              #{e.codigo} · {NOME_MODALIDADE[e.modalidade]} · {formatarPercentual(e.percentual_limiar)}
                            </span>
                          </span>
                        </span>
                        <SeloSituacaoEmprestimo situacao={e.situacao} />
                      </div>
                      <dl className="numeros mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-tinta-4">Principal</dt>
                          <dd className="font-medium">{formatarMoeda(paraCentavos(e.valor_principal))}</dd>
                        </div>
                        <div>
                          <dt className="text-tinta-4">Pago</dt>
                          <dd className="font-medium text-verde">{formatarMoeda(paraCentavos(e.total_pago))}</dd>
                        </div>
                        <div>
                          <dt className="text-tinta-4">Pendente</dt>
                          <dd className="font-medium">{formatarMoeda(paraCentavos(e.total_pendente))}</dd>
                        </div>
                        <div>
                          <dt className="text-tinta-4">Juros</dt>
                          <dd>{formatarMoeda(paraCentavos(e.valor_juros))}</dd>
                        </div>
                        <div>
                          <dt className="text-tinta-4">Total</dt>
                          <dd>{formatarMoeda(paraCentavos(e.valor_total))}</dd>
                        </div>
                        <div>
                          <dt className="text-tinta-4">Próx. venc.</dt>
                          <dd>{e.proximo_vencimento ? formatarData(e.proximo_vencimento) : '—'}</dd>
                        </div>
                      </dl>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Cartao>
        <Paginacao pagina={lista.pagina} total={lista.total} porPagina={lista.porPagina} />
      </div>
    </>
  )
}
