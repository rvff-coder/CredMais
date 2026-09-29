'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  ChevronsUpDown,
  CircleCheck,
  HandCoins,
  Handshake,
  Paperclip,
  Pencil,
  Plus,
  UserCheck,
  UserPlus,
  UserX,
  type LucideIcon,
} from 'lucide-react'

import { SeloParcela } from '@/components/status'
import { Pilula, cx } from '@/components/ui'
import { carregarEventos } from '@/acoes/cadastros'
import { formatarMoeda, paraCentavos } from '@/lib/financeiro/dinheiro'
import { diaDoInstante, formatarData, formatarHora, hojeBR } from '@/lib/financeiro/datas'
import { NOME_MODALIDADE, formatarPercentual } from '@/lib/financeiro/emprestimo'
import type { Evento, StatusParcela, TipoEvento } from '@/lib/tipos'

type Aparencia = { icone: LucideIcon; cor: string; anel: string }

const APARENCIA: Record<TipoEvento, Aparencia> = {
  CLIENTE_CRIADO: { icone: UserPlus, cor: 'text-tinta-2', anel: 'bg-painel-4' },
  CLIENTE_ATUALIZADO: { icone: Pencil, cor: 'text-tinta-2', anel: 'bg-painel-4' },
  CLIENTE_DESATIVADO: { icone: UserX, cor: 'text-tinta-2', anel: 'bg-painel-4' },
  CLIENTE_REATIVADO: { icone: UserCheck, cor: 'text-tinta-2', anel: 'bg-painel-4' },
  EMPRESTIMO_CRIADO: { icone: HandCoins, cor: 'text-azul-claro', anel: 'bg-azul-fundo' },
  PARCELA_PAGA: { icone: CircleCheck, cor: 'text-verde', anel: 'bg-verde-fundo' },
  COMPROVANTE_ANEXADO: { icone: Paperclip, cor: 'text-violeta', anel: 'bg-violeta-fundo' },
  PARCELA_EM_ATRASO: { icone: AlertTriangle, cor: 'text-vermelho', anel: 'bg-vermelho-fundo' },
  EMPRESTIMO_FINALIZADO: { icone: BadgeCheck, cor: 'text-verde', anel: 'bg-verde-fundo' },
  ACERTO_REALIZADO: { icone: Handshake, cor: 'text-verde', anel: 'bg-verde-fundo' },
  VALOR_ADICIONADO: { icone: Plus, cor: 'text-verde', anel: 'bg-verde-fundo' },
}

/** Rótulo curto do dia: "Hoje", "Ontem" ou a data. */
function rotuloDia(dia: string, hoje: string) {
  if (dia === hoje) return 'Hoje'
  const ontem = new Date(`${hoje}T12:00:00Z`)
  ontem.setUTCDate(ontem.getUTCDate() - 1)
  if (dia === ontem.toISOString().slice(0, 10)) return 'Ontem'
  return formatarData(dia)
}

export function Timeline({
  clienteId,
  eventosIniciais,
  temMaisInicial,
  compacta = false,
}: {
  clienteId: string
  eventosIniciais: Evento[]
  temMaisInicial: boolean
  compacta?: boolean
}) {
  const [extras, setExtras] = useState<{ eventos: Evento[]; temMais: boolean } | null>(null)
  const [carregando, iniciar] = useTransition()

  // Quando a página revalida (novo pagamento etc.), os eventos iniciais mudam;
  // os extras carregados antes ficariam velhos, então são descartados.
  const [base, setBase] = useState(eventosIniciais)
  if (base !== eventosIniciais) {
    setBase(eventosIniciais)
    setExtras(null)
  }

  const eventos = extras?.eventos ?? eventosIniciais
  const temMais = extras?.temMais ?? temMaisInicial
  const hoje = hojeBR()

  if (eventos.length === 0) {
    return <p className="py-10 text-center text-sm text-tinta-3">Nenhuma atividade registrada.</p>
  }

  // Agrupa por dia, mantendo a ordem (mais recente primeiro).
  const grupos: { dia: string; itens: Evento[] }[] = []
  for (const e of eventos) {
    const dia = diaDoInstante(e.created_at)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.dia === dia) ultimo.itens.push(e)
    else grupos.push({ dia, itens: [e] })
  }

  return (
    <div>
      <ol className="relative">
        {grupos.map((g) => (
          <li key={g.dia} className="relative">
            <p className="mb-2 pl-11 text-[11px] font-semibold tracking-wider text-tinta-4 uppercase">
              {rotuloDia(g.dia, hoje)}
            </p>
            <ol>
              {g.itens.map((e) => (
                <ItemTimeline key={e.id} evento={e} compacta={compacta} />
              ))}
            </ol>
          </li>
        ))}
      </ol>

      {temMais && (
        <button
          type="button"
          disabled={carregando}
          onClick={() =>
            iniciar(async () => {
              const r = await carregarEventos(clienteId, eventos.length + 30)
              if (r) setExtras(r)
            })
          }
          className="mt-2 flex items-center gap-3 pl-1 text-sm font-medium text-azul-claro transition-colors hover:text-azul disabled:opacity-50"
        >
          <span className="grid size-7 place-items-center rounded-full border border-borda-forte bg-painel-3 text-tinta-2">
            <ChevronsUpDown className="size-3.5" aria-hidden />
          </span>
          {carregando ? 'Carregando…' : 'Mostrar eventos anteriores'}
        </button>
      )}
    </div>
  )
}

function ItemTimeline({ evento: e, compacta }: { evento: Evento; compacta: boolean }) {
  const a = APARENCIA[e.tipo_evento]
  const Icone = a.icone
  const valor = e.valor !== null ? paraCentavos(e.valor) : null
  const parcelaTexto = e.numero_parcela ? `Parcela ${e.numero_parcela}/${e.quantidade_parcelas}` : null

  // Evento de atraso de parcela que já foi paga depois: mostra o status atual.
  const statusParcela: StatusParcela | null =
    e.tipo_evento === 'PARCELA_EM_ATRASO' || e.tipo_evento === 'PARCELA_PAGA' ? e.parcela_status : null

  const detalhe = detalheDoEvento(e, parcelaTexto)

  return (
    <li className="group relative flex gap-3 pb-5 last:pb-6">
      {/* Linha vertical */}
      <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-px bg-borda-forte" />
      <span className={cx('relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-painel', a.anel)}>
        <Icone className={cx('size-4', a.cor)} aria-hidden />
      </span>

      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-tinta">{e.titulo}</span>
          {valor !== null && e.tipo_evento !== 'PARCELA_EM_ATRASO' && (
            <span
              className={cx(
                'numeros text-sm font-semibold',
                e.tipo_evento === 'EMPRESTIMO_CRIADO' || e.tipo_evento === 'ACERTO_REALIZADO' ? 'text-tinta' : 'text-verde',
              )}
            >
              {formatarMoeda(valor)}
            </span>
          )}
          <Pilula>
            {formatarData(diaDoInstante(e.created_at))} {formatarHora(e.created_at)}
          </Pilula>
          {statusParcela && e.tipo_evento === 'PARCELA_EM_ATRASO' && <SeloParcela status={statusParcela} />}
        </div>

        {(detalhe || e.descricao) && (
          <div
            className={cx(
              'mt-2 space-y-0.5 rounded-xl border border-borda bg-painel-2 px-3 py-2 text-xs leading-relaxed text-tinta-2',
              compacta && 'bg-painel-3/60',
            )}
          >
            {detalhe && <p className="numeros">{detalhe}</p>}
            {e.descricao && e.descricao !== detalhe && e.descricao !== parcelaTexto && (
              <p className="text-tinta-3">{e.descricao}</p>
            )}
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-tinta-4">
          {e.usuario_nome && <span>por {e.usuario_nome}</span>}
          {!e.usuario_nome && e.tipo_evento === 'PARCELA_EM_ATRASO' && <span>automático</span>}
          {e.emprestimo_id && (
            <Link href={`/emprestimos/${e.emprestimo_id}`} className="text-azul-claro hover:underline">
              Empréstimo #{e.emprestimo_codigo}
            </Link>
          )}
          {e.comprovante_id && (
            <a
              href={`/comprovantes/${e.comprovante_id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-violeta hover:underline"
            >
              <Paperclip className="size-3" aria-hidden /> Ver comprovante
            </a>
          )}
        </div>
      </div>
    </li>
  )
}

function detalheDoEvento(e: Evento, parcelaTexto: string | null): string | null {
  switch (e.tipo_evento) {
    case 'EMPRESTIMO_CRIADO':
      if (!e.modalidade) return null
      return `${NOME_MODALIDADE[e.modalidade]} • Limiar aplicado: ${formatarPercentual(e.percentual_limiar ?? 0)} • ${e.quantidade_parcelas} ${e.quantidade_parcelas === 1 ? 'parcela' : 'parcelas'}`
    case 'PARCELA_PAGA':
      return parcelaTexto
    case 'PARCELA_EM_ATRASO':
      return parcelaTexto && e.data_vencimento
        ? `${parcelaTexto} • Vencimento: ${formatarData(e.data_vencimento)}${e.valor !== null ? ` • ${formatarMoeda(paraCentavos(e.valor))}` : ''}`
        : null
    case 'COMPROVANTE_ANEXADO':
      return null
    default:
      return null
  }
}
