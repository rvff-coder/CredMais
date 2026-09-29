import type { Metadata } from 'next'
import { UsersRound } from 'lucide-react'

import { Cabecalho } from '@/components/casca/cabecalho'
import { BarraBusca, Filtros, Paginacao } from '@/components/navegacao'
import { BotaoEditarSocio, BotaoNovoSocio, BotaoStatusSocio } from '@/components/operacoes/cadastros'
import { SeloCadastro } from '@/components/status'
import { Avatar, Cartao, EstadoVazio } from '@/components/ui'
import { obterConfiguracoes } from '@/lib/servicos/configuracoes'
import { listarSocios } from '@/lib/servicos/socios'
import { exigirSessao } from '@/lib/servicos/sessao'
import type { StatusCadastro } from '@/lib/tipos'

export const metadata: Metadata = { title: 'Sócios' }

export default async function PaginaSocios({ searchParams }: PageProps<'/socios'>) {
  const { supabase } = await exigirSessao()
  const params = await searchParams
  const config = await obterConfiguracoes()

  const status = params.status === 'ATIVO' || params.status === 'INATIVO' ? (params.status as StatusCadastro) : undefined
  const busca = typeof params.q === 'string' ? params.q : undefined
  const pagina = Number(params.p) > 0 ? Number(params.p) : 1

  const lista = await listarSocios(supabase, { status, busca, pagina, porPagina: config.itens_por_pagina })
  const filtrando = Boolean(status || busca)

  return (
    <>
      <Cabecalho titulo="Sócios" descricao="Cadastro dos sócios do negócio e suas chaves Pix." acoes={<BotaoNovoSocio />} />

      <div className="space-y-4 px-4 pt-2 pb-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <BarraBusca placeholder="Buscar por nome, telefone ou Pix" className="w-full max-w-md" />
          <Filtros
            nome="status"
            opcoes={[
              { valor: 'ATIVO', rotulo: 'Ativos' },
              { valor: 'INATIVO', rotulo: 'Inativos' },
            ]}
          />
        </div>

        <Cartao className="overflow-hidden">
          {lista.itens.length === 0 ? (
            <EstadoVazio
              icone={<UsersRound className="size-5" />}
              titulo={filtrando ? 'Nenhum sócio encontrado.' : 'Nenhum sócio cadastrado.'}
              descricao={filtrando ? 'Tente outro termo ou remova o filtro.' : 'Cadastre os sócios para manter os dados de contato e Pix à mão.'}
              acao={!filtrando && <BotaoNovoSocio />}
            />
          ) : (
            <>
              <table className="hidden w-full text-sm md:table">
                <thead>
                  <tr className="border-b border-borda text-left text-[11px] font-medium tracking-wide text-tinta-4 uppercase">
                    <th className="px-5 py-3 font-medium">Nome</th>
                    <th className="px-3 py-3 font-medium">Telefone</th>
                    <th className="px-3 py-3 font-medium">Chave Pix</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {lista.itens.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-painel-2">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <Avatar nome={s.nome} tamanho="sm" />
                          <span className="font-medium">{s.nome}</span>
                        </span>
                      </td>
                      <td className="numeros px-3 py-3 text-tinta-2">{s.telefone || '—'}</td>
                      <td className="max-w-64 truncate px-3 py-3 font-mono text-xs text-tinta-2">{s.chave_pix || '—'}</td>
                      <td className="px-3 py-3">
                        <SeloCadastro status={s.status} />
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex justify-end gap-1">
                          <BotaoEditarSocio socio={s} />
                          <BotaoStatusSocio id={s.id} nome={s.nome} status={s.status} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-borda md:hidden">
                {lista.itens.map((s) => (
                  <li key={s.id} className="space-y-2 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar nome={s.nome} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{s.nome}</span>
                          <span className="numeros block text-xs text-tinta-3">{s.telefone || 'Sem telefone'}</span>
                        </span>
                      </span>
                      <SeloCadastro status={s.status} />
                    </div>
                    {s.chave_pix && (
                      <p className="truncate rounded-lg bg-painel-2 px-3 py-2 font-mono text-xs text-tinta-2">Pix: {s.chave_pix}</p>
                    )}
                    <div className="flex justify-end gap-1">
                      <BotaoEditarSocio socio={s} />
                      <BotaoStatusSocio id={s.id} nome={s.nome} status={s.status} />
                    </div>
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
