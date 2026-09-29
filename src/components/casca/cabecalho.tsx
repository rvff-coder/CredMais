import type { ReactNode } from 'react'

import { Notificacoes } from '@/components/casca/notificacoes'
import { Avatar } from '@/components/ui'
import { obterConfiguracoes } from '@/lib/servicos/configuracoes'
import { listarPagamentosDeHoje, listarParcelasEmAtraso } from '@/lib/servicos/painel'
import { exigirSessao, obterPerfil } from '@/lib/servicos/sessao'
import { paraCentavos } from '@/lib/financeiro/dinheiro'

/** Topo das páginas: título, descrição, ações, notificações e avatar. */
export async function Cabecalho({
  titulo,
  descricao,
  acoes,
  antesDoTitulo,
}: {
  titulo: ReactNode
  descricao?: ReactNode
  acoes?: ReactNode
  antesDoTitulo?: ReactNode
}) {
  const { supabase } = await exigirSessao()
  const [perfil, config, hoje, atrasadas] = await Promise.all([
    obterPerfil(),
    obterConfiguracoes(),
    listarPagamentosDeHoje(supabase, 20),
    listarParcelasEmAtraso(supabase, 10),
  ])

  const itens = [
    ...(config.notificar_atrasos
      ? atrasadas.itens.map((p) => ({
          id: `a-${p.id}`,
          tom: 'vermelho' as const,
          titulo: `${p.cliente_nome}`,
          texto: `Parcela ${p.numero_parcela}/${p.quantidade_parcelas} em atraso há ${p.dias_atraso} ${p.dias_atraso === 1 ? 'dia' : 'dias'}`,
          valor: paraCentavos(p.valor),
          href: `/emprestimos/${p.emprestimo_id}`,
        }))
      : []),
    ...(config.notificar_vencimentos
      ? hoje
          .filter((p) => p.status !== 'PAGO')
          .map((p) => ({
            id: `h-${p.id}`,
            tom: 'azul' as const,
            titulo: `${p.cliente_nome}`,
            texto: `Parcela ${p.numero_parcela}/${p.quantidade_parcelas} vence hoje`,
            valor: paraCentavos(p.valor),
            href: `/emprestimos/${p.emprestimo_id}`,
          }))
      : []),
  ]

  const totalAtrasos = config.notificar_atrasos ? atrasadas.total : 0

  return (
    <header className="flex flex-col gap-4 px-4 pt-6 pb-2 sm:px-6 lg:px-8 lg:pt-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          {antesDoTitulo}
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{titulo}</h1>
          {descricao && <p className="text-sm text-tinta-3">{descricao}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Notificacoes itens={itens} extra={Math.max(0, totalAtrasos - atrasadas.itens.length)} />
          <span className="hidden lg:inline-flex" title={perfil?.nome}>
            <Avatar nome={perfil?.nome ?? 'Usuário'} />
          </span>
        </div>
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  )
}
