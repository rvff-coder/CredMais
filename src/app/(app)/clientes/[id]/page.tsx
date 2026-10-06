import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarClock, HandCoins, Phone, StickyNote } from 'lucide-react'

import { Cabecalho } from '@/components/casca/cabecalho'
import { BotaoEditarCliente, BotaoStatusCliente } from '@/components/operacoes/cadastros'
import { BotaoAcerto } from '@/components/operacoes/carteira'
import { BotaoEmprestar } from '@/components/operacoes/emprestar'
import { BotaoPagamento } from '@/components/operacoes/pagamento'
import { SeloCadastro, SeloParcela, SeloSituacaoCliente, SeloSituacaoEmprestimo } from '@/components/status'
import { Timeline } from '@/components/timeline'
import { Avatar, BotaoLink, Cartao, EstadoVazio, Pilula, TituloSecao } from '@/components/ui'
import { formatarMoeda, paraCentavos } from '@/lib/financeiro/dinheiro'
import { formatarData, hojeBR } from '@/lib/financeiro/datas'
import { NOME_MODALIDADE, formatarPercentual } from '@/lib/financeiro/emprestimo'
import { calcularSaldo } from '@/lib/servicos/carteira'
import { listarEventosCliente, obterCliente } from '@/lib/servicos/clientes'
import { listarEmprestimosDoCliente, proximasParcelasDoCliente } from '@/lib/servicos/emprestimos'
import { exigirSessao } from '@/lib/servicos/sessao'
import { formatarDocumento } from '@/lib/validacao/documento'

export async function generateMetadata({ params }: PageProps<'/clientes/[id]'>): Promise<Metadata> {
  const { id } = await params
  const { supabase } = await exigirSessao()
  const c = /^[0-9a-f-]{36}$/i.test(id) ? await obterCliente(supabase, id) : null
  return { title: c?.nome ?? 'Cliente' }
}

export default async function PaginaCliente({ params }: PageProps<'/clientes/[id]'>) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const { supabase } = await exigirSessao()
  const cliente = await obterCliente(supabase, id)
  if (!cliente) notFound()

  const [emprestimos, proximas, eventos, saldo] = await Promise.all([
    listarEmprestimosDoCliente(supabase, id),
    proximasParcelasDoCliente(supabase, id),
    listarEventosCliente(supabase, id, 30),
    calcularSaldo(supabase),
  ])

  const hoje = hojeBR()
  const ativos = emprestimos.filter((e) => e.status === 'ATIVO')
  const totalRecebido = emprestimos.reduce((s, e) => s + paraCentavos(e.total_pago), 0)
  const totalEmprestado = emprestimos.reduce((s, e) => s + paraCentavos(e.valor_principal), 0)

  return (
    <>
      <Cabecalho
        antesDoTitulo={
          <Link href="/clientes" className="mb-2 inline-flex items-center gap-1 text-xs text-tinta-3 hover:text-tinta">
            <ArrowLeft className="size-3.5" aria-hidden /> Clientes
          </Link>
        }
        titulo={
          <span className="flex items-center gap-3">
            <Avatar nome={cliente.nome} tamanho="lg" className="hidden sm:inline-grid" />
            <span className="min-w-0 sm:truncate">{cliente.nome}</span>
          </span>
        }
        descricao={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:pl-[68px]">
            <span className="numeros">{formatarDocumento(cliente.cnpj)}</span>
            {cliente.contato && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" aria-hidden /> {cliente.contato}
              </span>
            )}
            <SeloSituacaoCliente situacao={cliente.situacao} />
            {cliente.status === 'INATIVO' && <SeloCadastro status="INATIVO" />}
          </span>
        }
        acoes={
          <>
            {cliente.status === 'ATIVO' && <BotaoEmprestar clienteId={cliente.id} clienteNome={cliente.nome} />}
            <BotaoAcerto clienteId={cliente.id} clienteNome={cliente.nome} saldo={paraCentavos(saldo)} />
            {ativos.length > 0 && (
              <BotaoLink href={`/emprestimos/${ativos[0].id}`} variante="secundario">
                Ver empréstimo
              </BotaoLink>
            )}
            <span className="ml-auto flex items-center gap-1">
              <BotaoEditarCliente cliente={cliente} />
              <BotaoStatusCliente id={cliente.id} nome={cliente.nome} status={cliente.status} />
            </span>
          </>
        }
      />

      <div className="grid gap-6 px-4 pt-4 pb-10 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Resumo do cliente">
            {[
              { rotulo: 'Saldo pendente', valor: formatarMoeda(paraCentavos(cliente.saldo_pendente)), forte: true },
              { rotulo: 'Empréstimos ativos', valor: String(cliente.emprestimos_ativos) },
              { rotulo: 'Total emprestado', valor: formatarMoeda(totalEmprestado) },
              { rotulo: 'Total recebido', valor: formatarMoeda(totalRecebido) },
            ].map((d) => (
              <Cartao key={d.rotulo} className="p-4">
                <p className="text-[11px] font-semibold tracking-wider text-tinta-3 uppercase">{d.rotulo}</p>
                <p className={`numeros mt-2 truncate text-lg font-semibold ${d.forte ? 'text-tinta' : 'text-tinta-2'}`}>{d.valor}</p>
              </Cartao>
            ))}
          </section>

          <Cartao className="p-5">
            <TituloSecao>Próximo pagamento</TituloSecao>
            {proximas.length === 0 ? (
              <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-borda-forte p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Nenhum empréstimo ativo.</p>
                  <p className="text-xs text-tinta-3">
                    {cliente.status === 'ATIVO'
                      ? 'O cliente está livre para um novo empréstimo.'
                      : 'Reative o cadastro para emprestar novamente.'}
                  </p>
                </div>
                {cliente.status === 'ATIVO' && <BotaoEmprestar clienteId={cliente.id} clienteNome={cliente.nome} />}
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {proximas.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl border border-borda bg-painel-2 p-4 sm:flex-row sm:items-center"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-painel-4 leading-none">
                      <CalendarClock className="size-5 text-tinta-2" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        Parcela {p.numero_parcela}/{p.quantidade_parcelas}
                        <SeloParcela status={p.status_efetivo} />
                      </p>
                      <p className="numeros mt-0.5 text-xs text-tinta-3">
                        Vencimento {formatarData(p.data_vencimento)} · Empréstimo #{p.emprestimo_codigo} ·{' '}
                        {NOME_MODALIDADE[p.modalidade]}
                        {p.dias_atraso > 0 && (
                          <span className="text-vermelho"> · {p.dias_atraso} {p.dias_atraso === 1 ? 'dia' : 'dias'} em atraso</span>
                        )}
                      </p>
                    </div>
                    <span className="numeros text-lg font-semibold">{formatarMoeda(paraCentavos(p.valor))}</span>
                    <BotaoPagamento
                      hoje={hoje}
                      parcela={{
                        id: p.id,
                        numero: p.numero_parcela,
                        total: p.quantidade_parcelas,
                        valor: paraCentavos(p.valor),
                        vencimento: p.data_vencimento,
                        status: p.status_efetivo,
                        clienteNome: cliente.nome,
                        emprestimoCodigo: p.emprestimo_codigo,
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao className="p-5">
            <TituloSecao>Empréstimos</TituloSecao>
            {emprestimos.length === 0 ? (
              <EstadoVazio
                icone={<HandCoins className="size-5" />}
                titulo="Nenhum empréstimo encontrado."
                descricao="Os empréstimos deste cliente aparecerão aqui."
                className="py-10"
              />
            ) : (
              <ul className="mt-3 divide-y divide-borda">
                {emprestimos.map((e) => {
                  const pago = paraCentavos(e.total_pago)
                  const total = paraCentavos(e.valor_total)
                  const progresso = total > 0 ? Math.round((pago / total) * 100) : 0
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/emprestimos/${e.id}`}
                        className="group -mx-2 flex flex-col gap-2 rounded-xl px-2 py-3 transition-colors hover:bg-painel-2 sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            #{e.codigo} · {formatarMoeda(paraCentavos(e.valor_principal))}
                            <SeloSituacaoEmprestimo situacao={e.situacao} />
                          </p>
                          <p className="numeros mt-0.5 text-xs text-tinta-3">
                            {NOME_MODALIDADE[e.modalidade]} · {formatarPercentual(e.percentual_limiar)} ·{' '}
                            {e.quantidade_parcelas} {e.quantidade_parcelas === 1 ? 'parcela' : 'parcelas'} · desde{' '}
                            {formatarData(e.data_emprestimo)}
                          </p>
                        </div>
                        <div className="w-full sm:w-48">
                          <div className="numeros flex justify-between text-[11px] text-tinta-3">
                            <span>
                              {e.parcelas_pagas}/{e.quantidade_parcelas} pagas
                            </span>
                            <span>{progresso}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-painel-4">
                            <div
                              className={`h-full rounded-full ${e.situacao === 'EM_ATRASO' ? 'bg-vermelho' : e.situacao === 'FINALIZADO' ? 'bg-verde' : 'bg-azul'}`}
                              style={{ width: `${progresso}%` }}
                            />
                          </div>
                        </div>
                        <ArrowRight className="hidden size-4 text-tinta-4 transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Cartao>

          {cliente.observacoes && (
            <Cartao className="p-5">
              <TituloSecao>
                <span className="flex items-center gap-2">
                  <StickyNote className="size-4 text-tinta-3" aria-hidden /> Observações
                </span>
              </TituloSecao>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-tinta-2">{cliente.observacoes}</p>
            </Cartao>
          )}
          <p className="text-xs text-tinta-4">
            Cliente cadastrado em <Pilula>{formatarData(cliente.data_cadastro)}</Pilula>
          </p>
        </div>

        <Cartao className="h-fit rounded-painel bg-painel p-5 xl:sticky xl:top-6">
          <TituloSecao className="mb-5">Atividade do cliente</TituloSecao>
          <Timeline clienteId={cliente.id} eventosIniciais={eventos.eventos} temMaisInicial={eventos.temMais} />
        </Cartao>
      </div>
    </>
  )
}
