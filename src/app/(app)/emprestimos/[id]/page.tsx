import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BadgeCheck, CalendarClock, Paperclip } from 'lucide-react'

import { Cabecalho } from '@/components/casca/cabecalho'
import { BotaoEmprestar } from '@/components/operacoes/emprestar'
import { BotaoAnexarComprovante, BotaoPagamento } from '@/components/operacoes/pagamento'
import { SeloParcela, SeloSituacaoEmprestimo } from '@/components/status'
import { Cartao, Dado, Pilula, TituloSecao, cx } from '@/components/ui'
import { formatarMoeda, paraCentavos } from '@/lib/financeiro/dinheiro'
import { formatarData, formatarDataHora, hojeBR, nomeDiaSemana } from '@/lib/financeiro/datas'
import { NOME_MODALIDADE, formatarPercentual } from '@/lib/financeiro/emprestimo'
import { listarParcelas, obterEmprestimo } from '@/lib/servicos/emprestimos'
import { exigirSessao } from '@/lib/servicos/sessao'

export const metadata: Metadata = { title: 'Empréstimo' }

export default async function PaginaEmprestimo({ params }: PageProps<'/emprestimos/[id]'>) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const { supabase } = await exigirSessao()
  const [emprestimo, parcelas] = await Promise.all([obterEmprestimo(supabase, id), listarParcelas(supabase, id)])
  if (!emprestimo) notFound()

  const hoje = hojeBR()
  const proxima = parcelas.find((p) => p.status !== 'PAGO') ?? null
  const pagas = parcelas.filter((p) => p.status === 'PAGO').length
  const atrasadas = parcelas.filter((p) => p.status_efetivo === 'EM_ATRASO').length
  const pendentes = parcelas.length - pagas
  const total = paraCentavos(emprestimo.valor_total)
  const pago = paraCentavos(emprestimo.total_pago)
  const progresso = total > 0 ? (pago / total) * 100 : 0

  // O cliente tem outro empréstimo ativo? Decide entre "Emprestar" e nada.
  let outroAtivo = false
  if (emprestimo.status === 'FINALIZADO') {
    const { count } = await supabase
      .from('emprestimos')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', emprestimo.cliente_id)
      .eq('status', 'ATIVO')
    outroAtivo = (count ?? 0) > 0
  }

  return (
    <>
      <Cabecalho
        antesDoTitulo={
          <Link
            href={`/clientes/${emprestimo.cliente_id}`}
            className="mb-2 inline-flex items-center gap-1 text-xs text-tinta-3 hover:text-tinta"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> {emprestimo.cliente_nome}
          </Link>
        }
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            Empréstimo #{emprestimo.codigo}
            <SeloSituacaoEmprestimo situacao={emprestimo.situacao} />
          </span>
        }
        descricao={`${NOME_MODALIDADE[emprestimo.modalidade]} · criado em ${formatarData(emprestimo.data_emprestimo)}`}
      />

      <div className="grid gap-6 px-4 pt-4 pb-10 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Próximo pagamento / finalização */}
          <Cartao className="overflow-hidden">
            {proxima ? (
              <div className="space-y-4 p-5">
                <p className="text-[11px] font-semibold tracking-wider text-tinta-3 uppercase">Próximo pagamento</p>
                <div className="flex items-center gap-4">
                  <span className="grid w-14 shrink-0 place-items-center rounded-2xl bg-painel-3 py-2 leading-none">
                    <span className="text-[10px] font-semibold tracking-wider text-tinta-3 uppercase">
                      {nomeDiaSemana(proxima.data_vencimento, true)}
                    </span>
                    <span className="numeros mt-1 text-xl font-semibold">{proxima.data_vencimento.slice(8, 10)}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      Parcela {proxima.numero_parcela}/{emprestimo.quantidade_parcelas}
                    </p>
                    <p className="numeros text-2xl font-semibold tracking-tight">{formatarMoeda(paraCentavos(proxima.valor))}</p>
                    <p className="numeros text-xs text-tinta-3">Vencimento {formatarData(proxima.data_vencimento)}</p>
                  </div>
                </div>
                {proxima.status_efetivo === 'EM_ATRASO' && (
                  <p className="rounded-xl bg-vermelho-fundo px-3 py-2 text-xs font-medium text-vermelho">
                    Em atraso há {proxima.dias_atraso} {proxima.dias_atraso === 1 ? 'dia' : 'dias'}
                  </p>
                )}
                <BotaoPagamento
                  className="w-full"
                  hoje={hoje}
                  parcela={{
                    id: proxima.id,
                    numero: proxima.numero_parcela,
                    total: emprestimo.quantidade_parcelas,
                    valor: paraCentavos(proxima.valor),
                    vencimento: proxima.data_vencimento,
                    status: proxima.status_efetivo,
                    clienteNome: emprestimo.cliente_nome,
                    emprestimoCodigo: emprestimo.codigo,
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-verde">
                  <BadgeCheck className="size-5" aria-hidden /> Empréstimo finalizado
                </p>
                <p className="text-xs text-tinta-3">
                  Todas as parcelas foram pagas
                  {emprestimo.finalizado_em && ` · ${formatarDataHora(emprestimo.finalizado_em)}`}.
                </p>
                {!outroAtivo && (
                  <BotaoEmprestar
                    className="w-full"
                    clienteId={emprestimo.cliente_id}
                    clienteNome={emprestimo.cliente_nome}
                  />
                )}
              </div>
            )}
          </Cartao>

          <Cartao className="p-5">
            <TituloSecao>Resumo</TituloSecao>
            <div className="mt-4">
              <div className="numeros flex justify-between text-xs text-tinta-3">
                <span>Recebido</span>
                <span>{Math.round(progresso)}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-painel-4">
                <div
                  className={cx('h-full rounded-full', emprestimo.situacao === 'EM_ATRASO' ? 'bg-vermelho' : emprestimo.situacao === 'FINALIZADO' ? 'bg-verde' : 'bg-azul')}
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
            <dl className="mt-3 divide-y divide-borda">
              <Dado rotulo="Valor emprestado" destaque>
                {formatarMoeda(paraCentavos(emprestimo.valor_principal))}
              </Dado>
              <Dado rotulo="Limiar (fixado na criação)">{formatarPercentual(emprestimo.percentual_limiar)}</Dado>
              <Dado rotulo="Juros">{formatarMoeda(paraCentavos(emprestimo.valor_juros))}</Dado>
              <Dado rotulo="Total" destaque>
                {formatarMoeda(total)}
              </Dado>
              <Dado rotulo="Total pago">
                <span className="text-verde">{formatarMoeda(pago)}</span>
              </Dado>
              <Dado rotulo="Total pendente">{formatarMoeda(paraCentavos(emprestimo.total_pendente))}</Dado>
              <Dado rotulo="Quantidade de parcelas">{emprestimo.quantidade_parcelas}</Dado>
              <Dado rotulo="Parcelas pagas">{pagas}</Dado>
              <Dado rotulo="Parcelas pendentes">{pendentes}</Dado>
              <Dado rotulo="Parcelas atrasadas">
                <span className={atrasadas ? 'font-semibold text-vermelho' : undefined}>{atrasadas}</span>
              </Dado>
            </dl>
            {emprestimo.observacoes && (
              <p className="mt-3 rounded-xl bg-painel-2 px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap text-tinta-2">
                {emprestimo.observacoes}
              </p>
            )}
          </Cartao>
        </div>

        <Cartao className="p-5">
          <TituloSecao
            acao={
              <span className="flex items-center gap-1.5 text-xs text-tinta-3">
                <CalendarClock className="size-3.5" aria-hidden />
                {emprestimo.modalidade === 'DIARIO' ? 'Sem domingos' : emprestimo.modalidade === 'SEMANAL' ? 'A cada 7 dias' : '30 dias'}
              </span>
            }
          >
            Parcelas
          </TituloSecao>

          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borda text-left text-[11px] font-medium tracking-wide text-tinta-4 uppercase">
                  <th className="py-2.5 pr-3 font-medium">Nº</th>
                  <th className="py-2.5 pr-3 font-medium">Vencimento</th>
                  <th className="py-2.5 pr-3 text-right font-medium">Valor</th>
                  <th className="py-2.5 pr-3 font-medium">Status</th>
                  <th className="py-2.5 pr-3 font-medium">Pagamento</th>
                  <th className="py-2.5 pr-3 font-medium">Comprovante</th>
                  <th className="py-2.5 font-medium">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {parcelas.map((p) => (
                  <tr key={p.id} className={cx(p.id === proxima?.id && 'bg-azul-fundo/30')}>
                    <td className="numeros py-2.5 pr-3 text-tinta-2">
                      {p.numero_parcela}/{emprestimo.quantidade_parcelas}
                    </td>
                    <td className="numeros py-2.5 pr-3">
                      {formatarData(p.data_vencimento)}{' '}
                      <span className="text-[11px] text-tinta-4">{nomeDiaSemana(p.data_vencimento, true)}</span>
                    </td>
                    <td className="numeros py-2.5 pr-3 text-right font-medium">{formatarMoeda(paraCentavos(p.valor))}</td>
                    <td className="py-2.5 pr-3">
                      <SeloParcela status={p.status_efetivo} />
                    </td>
                    <td className="numeros py-2.5 pr-3 text-xs text-tinta-2">
                      {p.data_pagamento ? formatarDataHora(p.data_pagamento) : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      <CelulaComprovante
                        parcela={p}
                        rotulo={`Parcela ${p.numero_parcela}/${emprestimo.quantidade_parcelas} · ${emprestimo.cliente_nome}`}
                      />
                    </td>
                    <td className="py-2.5 text-xs text-tinta-2">{p.responsavel_nome ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-3 divide-y divide-borda md:hidden">
            {parcelas.map((p) => (
              <li key={p.id} className={cx('flex items-center gap-3 py-3', p.id === proxima?.id && '-mx-2 rounded-xl bg-azul-fundo/30 px-2')}>
                <span className="numeros w-10 text-xs text-tinta-3">
                  {p.numero_parcela}/{emprestimo.quantidade_parcelas}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="numeros block text-sm">{formatarData(p.data_vencimento)}</span>
                  <span className="block text-[11px] text-tinta-4">
                    {p.data_pagamento ? `Pago ${formatarDataHora(p.data_pagamento)}` : nomeDiaSemana(p.data_vencimento)}
                    {p.responsavel_nome && ` · ${p.responsavel_nome}`}
                  </span>
                  <span className="mt-1 block text-xs">
                    <CelulaComprovante parcela={p} rotulo={`Parcela ${p.numero_parcela}/${emprestimo.quantidade_parcelas}`} />
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="numeros text-sm font-medium">{formatarMoeda(paraCentavos(p.valor))}</span>
                  <SeloParcela status={p.status_efetivo} />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-tinta-4">
            Soma das parcelas: <Pilula>{formatarMoeda(parcelas.reduce((s, p) => s + paraCentavos(p.valor), 0))}</Pilula>
          </p>
        </Cartao>
      </div>
    </>
  )
}

function CelulaComprovante({
  parcela,
  rotulo,
}: {
  parcela: { id: string; status: string; comprovante_id: string | null }
  rotulo: string
}) {
  if (parcela.comprovante_id) {
    return (
      <a
        href={`/comprovantes/${parcela.comprovante_id}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-violeta hover:underline"
      >
        <Paperclip className="size-3.5" aria-hidden /> Ver
      </a>
    )
  }
  if (parcela.status === 'PAGO') return <BotaoAnexarComprovante parcelaId={parcela.id} rotulo={rotulo} />
  return <span className="text-tinta-4">—</span>
}
