import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, MousePointerClick, Users, X } from 'lucide-react'

import { Cabecalho } from '@/components/casca/cabecalho'
import { BarraBusca, Filtros, Paginacao } from '@/components/navegacao'
import { BotaoNovoCliente } from '@/components/operacoes/cadastros'
import { BotaoAcerto } from '@/components/operacoes/carteira'
import { BotaoEmprestar } from '@/components/operacoes/emprestar'
import { SeloCadastro, SeloSituacaoCliente } from '@/components/status'
import { Timeline } from '@/components/timeline'
import { Avatar, BotaoLink, EstadoVazio, Pilula, cx } from '@/components/ui'
import { formatarMoeda, paraCentavos } from '@/lib/financeiro/dinheiro'
import { formatarData } from '@/lib/financeiro/datas'
import { listarClientes, listarEventosCliente, obterCliente } from '@/lib/servicos/clientes'
import { calcularSaldo } from '@/lib/servicos/carteira'
import { obterConfiguracoes } from '@/lib/servicos/configuracoes'
import { exigirSessao } from '@/lib/servicos/sessao'
import type { ClienteResumo, SituacaoCliente, StatusCadastro } from '@/lib/tipos'
import { formatarDocumento } from '@/lib/validacao/documento'

export const metadata: Metadata = { title: 'Clientes' }

const SITUACOES: SituacaoCliente[] = ['SEM_EMPRESTIMO', 'ATIVO', 'EM_ATRASO', 'FINALIZADO']

export default async function PaginaClientes({ searchParams }: PageProps<'/clientes'>) {
  const { supabase } = await exigirSessao()
  const params = await searchParams
  const config = await obterConfiguracoes()

  const busca = typeof params.q === 'string' ? params.q : undefined
  const status = params.status === 'ATIVO' || params.status === 'INATIVO' ? (params.status as StatusCadastro) : undefined
  const situacao = SITUACOES.includes(params.situacao as SituacaoCliente) ? (params.situacao as SituacaoCliente) : undefined
  const pagina = Number(params.p) > 0 ? Number(params.p) : 1
  const selecionadoId = typeof params.c === 'string' ? params.c : null

  const [lista, selecionado] = await Promise.all([
    listarClientes(supabase, { busca, status, situacao, pagina, porPagina: config.itens_por_pagina }),
    selecionadoId && /^[0-9a-f-]{36}$/i.test(selecionadoId) ? obterCliente(supabase, selecionadoId) : Promise.resolve(null),
  ])

  const [eventos, saldo] = selecionado
    ? await Promise.all([listarEventosCliente(supabase, selecionado.id, 25), calcularSaldo(supabase)])
    : [null, 0]

  // Mantém filtros ao trocar a seleção.
  function hrefSelecionar(id: string | null) {
    const novos = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (typeof v === 'string' && k !== 'c') novos.set(k, v)
    if (id) novos.set('c', id)
    const qs = novos.toString()
    return qs ? `/clientes?${qs}` : '/clientes'
  }

  // Agrupa por inicial, como uma agenda.
  const grupos: { letra: string; itens: ClienteResumo[] }[] = []
  for (const c of lista.itens) {
    const letra = c.nome.trim()[0]?.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '') ?? '#'
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.letra === letra) ultimo.itens.push(c)
    else grupos.push({ letra, itens: [c] })
  }

  const filtrando = Boolean(busca || status || situacao)

  return (
    <div className="flex min-h-dvh flex-col xl:h-dvh xl:flex-row">
      <section className="flex min-w-0 flex-1 flex-col xl:overflow-y-auto">
        <Cabecalho
          antesDoTitulo={
            <p className="numeros text-[11px] font-semibold tracking-wider text-tinta-4 uppercase">{lista.total} no total</p>
          }
          titulo="Clientes"
          acoes={<BotaoNovoCliente />}
        />

        <div className="flex flex-col gap-3 px-4 pt-2 sm:px-6 lg:px-8">
          <BarraBusca placeholder="Buscar por nome, CPF, CNPJ ou contato" className="max-w-md" />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Filtros
              nome="situacao"
              rotulo="Situação"
              opcoes={[
                { valor: 'ATIVO', rotulo: 'Ativo' },
                { valor: 'EM_ATRASO', rotulo: 'Em atraso' },
                { valor: 'FINALIZADO', rotulo: 'Finalizado' },
                { valor: 'SEM_EMPRESTIMO', rotulo: 'Sem empréstimo' },
              ]}
            />
            <Filtros
              nome="status"
              rotulo="Cadastro"
              opcoes={[
                { valor: 'ATIVO', rotulo: 'Ativos' },
                { valor: 'INATIVO', rotulo: 'Inativos' },
              ]}
            />
          </div>
        </div>

        <div className="@container flex-1 px-4 pt-4 pb-10 sm:px-6 lg:px-8">
          {lista.itens.length === 0 ? (
            <EstadoVazio
              icone={<Users className="size-5" />}
              titulo={filtrando ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
              descricao={filtrando ? 'Tente outro termo ou remova os filtros.' : 'Cadastre o primeiro cliente para começar a emprestar.'}
              acao={!filtrando && <BotaoNovoCliente>+ Novo cliente</BotaoNovoCliente>}
            />
          ) : (
            <>
              <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_7rem] gap-4 border-b border-borda px-3 pb-2 text-[11px] font-medium tracking-wide text-tinta-4 uppercase @3xl:grid @5xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_7rem]">
                <span>Nome</span>
                <span>Contato</span>
                <span className="hidden @5xl:block">Empréstimo ativo</span>
                <span>Próximo pagamento</span>
                <span>Status</span>
              </div>
              {grupos.map((g) => (
                <div key={g.letra}>
                  <p className="px-3 pt-4 pb-1 text-[11px] font-semibold text-tinta-4">{g.letra}</p>
                  <ul>
                    {g.itens.map((c) => (
                      <li key={c.id}>
                        <LinhaCliente cliente={c} href={hrefSelecionar(c.id)} ativo={c.id === selecionado?.id} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <Paginacao pagina={lista.pagina} total={lista.total} porPagina={lista.porPagina} />
            </>
          )}
        </div>
      </section>

      {/* Painel de atividade: coluna à direita no desktop, folha em tela cheia no celular. */}
      <aside
        className={cx(
          'xl:sticky xl:top-0 xl:block xl:h-dvh xl:w-[28rem] xl:shrink-0 xl:p-4 xl:pl-0 2xl:w-[32rem]',
          selecionado ? 'fixed inset-0 z-40 block bg-fundo xl:static xl:bg-transparent' : 'hidden',
        )}
      >
        <div className="flex h-full flex-col overflow-hidden bg-painel xl:rounded-painel xl:border xl:border-borda">
          {!selecionado ? (
            <div className="flex h-full flex-col">
              <div className="px-6 pt-6">
                <h2 className="text-xl font-semibold tracking-tight">Atividade do cliente</h2>
              </div>
              <EstadoVazio
                className="flex-1"
                icone={<MousePointerClick className="size-5" />}
                titulo="Selecione um cliente para visualizar sua atividade."
                descricao="Empréstimos, recebimentos, comprovantes, atrasos e acertos aparecem aqui em ordem cronológica."
              />
            </div>
          ) : (
            <>
              <div className="border-b border-borda px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold tracking-tight">Atividade do cliente</h2>
                  <Link
                    href={hrefSelecionar(null)}
                    scroll={false}
                    className="-mr-1 rounded-lg p-1.5 text-tinta-3 hover:bg-painel-3 hover:text-tinta"
                    aria-label="Fechar painel"
                  >
                    <X className="size-5" aria-hidden />
                  </Link>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar nome={selecionado.nome} tamanho="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{selecionado.nome}</p>
                    <p className="numeros truncate text-xs text-tinta-3">{formatarDocumento(selecionado.cnpj)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <SeloSituacaoCliente situacao={selecionado.situacao} />
                      {selecionado.status === 'INATIVO' && <SeloCadastro status="INATIVO" />}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-painel-2 px-3.5 py-2.5">
                  <span className="text-xs text-tinta-3">Saldo pendente</span>
                  <span className="numeros text-sm font-semibold">
                    {formatarMoeda(paraCentavos(selecionado.saldo_pendente))}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selecionado.status === 'ATIVO' && (
                    <BotaoEmprestar tamanho="sm" clienteId={selecionado.id} clienteNome={selecionado.nome} />
                  )}
                  <BotaoAcerto
                    tamanho="sm"
                    clienteId={selecionado.id}
                    clienteNome={selecionado.nome}
                    saldo={paraCentavos(saldo)}
                  />
                  <BotaoLink href={`/clientes/${selecionado.id}`} variante="fantasma" tamanho="sm">
                    Abrir cliente <ArrowUpRight className="size-3.5" aria-hidden />
                  </BotaoLink>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pt-5">
                <Timeline
                  key={selecionado.id}
                  clienteId={selecionado.id}
                  eventosIniciais={eventos?.eventos ?? []}
                  temMaisInicial={eventos?.temMais ?? false}
                />
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function LinhaCliente({ cliente: c, href, ativo }: { cliente: ClienteResumo; href: string; ativo: boolean }) {
  const proximo = c.proximo_vencimento
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={ativo ? 'true' : undefined}
      className={cx(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-xl border-b border-borda px-3 py-3 transition-colors',
        '@3xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_7rem]',
        '@5xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_7rem]',
        ativo ? 'border-transparent bg-painel-3' : 'hover:bg-painel-2',
        c.status === 'INATIVO' && 'opacity-60',
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Avatar nome={c.nome} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{c.nome}</span>
          <span className="numeros block truncate text-xs text-tinta-3">{formatarDocumento(c.cnpj)}</span>
        </span>
      </span>

      <span className="justify-self-end @3xl:hidden">
        <SeloSituacaoCliente situacao={c.situacao} />
      </span>

      <span className="hidden truncate text-xs text-tinta-2 @3xl:block">{c.contato || '—'}</span>

      <span className="numeros hidden text-sm @5xl:block">
        {paraCentavos(c.valor_ativo) > 0 ? formatarMoeda(paraCentavos(c.valor_ativo)) : <span className="text-tinta-4">—</span>}
      </span>

      <span className="col-span-2 flex items-center gap-2 pl-12 @3xl:col-span-1 @3xl:pl-0">
        {proximo ? (
          <>
            <Pilula className={c.parcelas_atrasadas > 0 ? '!bg-vermelho-fundo !text-vermelho' : undefined}>
              {formatarData(proximo)}
            </Pilula>
            <span className="numeros text-xs text-tinta-2">{formatarMoeda(paraCentavos(c.proximo_valor))}</span>
          </>
        ) : (
          <span className="hidden text-xs text-tinta-4 @3xl:inline">—</span>
        )}
      </span>

      <span className="hidden @3xl:block">
        <SeloSituacaoCliente situacao={c.situacao} />
      </span>
    </Link>
  )
}
