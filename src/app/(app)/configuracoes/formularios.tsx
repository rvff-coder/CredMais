'use client'

import { useTransition, type ReactNode } from 'react'

import { useAvisos } from '@/components/avisos'
import { Selecao } from '@/components/campos'
import { Botao, Campo, Cartao } from '@/components/ui'
import { alterarSenha, salvarConfiguracoes, salvarPerfil } from '@/acoes/ajustes'
import type { Configuracoes, Perfil, Resultado } from '@/lib/tipos'

function Secao({
  id,
  titulo,
  descricao,
  children,
}: {
  id: string
  titulo: string
  descricao: string
  children: ReactNode
}) {
  return (
    <section id={id} className="grid scroll-mt-6 gap-4 border-b border-borda py-8 first:pt-2 last:border-0 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div>
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <p className="mt-1 text-xs leading-relaxed text-tinta-3">{descricao}</p>
      </div>
      <Cartao className="p-5">{children}</Cartao>
    </section>
  )
}

function useEnvio(acao: (d: FormData) => Promise<Resultado>, limparAoSalvar = false) {
  const avisos = useAvisos()
  const [enviando, iniciar] = useTransition()
  function enviar(form: HTMLFormElement) {
    const dados = new FormData(form)
    iniciar(async () => {
      const r = await acao(dados)
      if (!r.ok) return avisos.erro(r.erro)
      avisos.sucesso(r.mensagem)
      if (limparAoSalvar) form.reset()
    })
  }
  return { enviando, enviar }
}

function Interruptor({ name, rotulo, descricao, marcado }: { name: string; rotulo: string; descricao: string; marcado: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm">{rotulo}</span>
        <span className="block text-xs text-tinta-3">{descricao}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={marcado} className="peer sr-only" />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-painel-4 transition-colors peer-checked:bg-azul
                   peer-focus-visible:outline-2 peer-focus-visible:outline-azul-claro
                   after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-white after:transition-transform
                   peer-checked:after:translate-x-4"
      />
    </label>
  )
}

export function Formularios({ config, perfil }: { config: Configuracoes; perfil: Perfil }) {
  const gerais = useEnvio(salvarConfiguracoes)
  const dadosPerfil = useEnvio(salvarPerfil)
  const senha = useEnvio(alterarSenha, true)

  return (
    <div>
      <Secao id="sistema" titulo="Sistema e negócio" descricao="Nome exibido no menu e dados cadastrais do negócio.">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            gerais.enviar(e.currentTarget)
          }}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome do sistema" name="nome_sistema" defaultValue={config.nome_sistema} required maxLength={60} />
            <Campo rotulo="Razão social" name="razao_social" defaultValue={config.razao_social} maxLength={160} />
            <Campo rotulo="CNPJ do negócio" name="cnpj_negocio" defaultValue={config.cnpj_negocio} maxLength={20} />
            <Campo rotulo="Telefone" name="telefone_negocio" type="tel" defaultValue={config.telefone_negocio} maxLength={40} />
            <Campo rotulo="E-mail" name="email_negocio" type="email" defaultValue={config.email_negocio} maxLength={160} />
            <Campo rotulo="Endereço" name="endereco_negocio" defaultValue={config.endereco_negocio} maxLength={300} />
          </div>

          <div className="border-t border-borda pt-5">
            <p className="mb-3 text-xs font-semibold tracking-wider text-tinta-3 uppercase">Preferências de interface</p>
            <Selecao
              rotulo="Itens por página nas listas"
              name="itens_por_pagina"
              defaultValue={String(config.itens_por_pagina)}
              className="max-w-xs"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} itens
                </option>
              ))}
            </Selecao>
          </div>

          <div id="notificacoes" className="scroll-mt-6 border-t border-borda pt-5">
            <p className="mb-1 text-xs font-semibold tracking-wider text-tinta-3 uppercase">Notificações</p>
            <Interruptor
              name="notificar_vencimentos"
              rotulo="Parcelas vencendo hoje"
              descricao="Mostra no sino as parcelas com vencimento no dia."
              marcado={config.notificar_vencimentos}
            />
            <Interruptor
              name="notificar_atrasos"
              rotulo="Parcelas em atraso"
              descricao="Mostra no sino as parcelas vencidas e não pagas."
              marcado={config.notificar_atrasos}
            />
          </div>

          <div className="flex justify-end">
            <Botao type="submit" disabled={gerais.enviando}>
              {gerais.enviando ? 'Salvando…' : 'Salvar configurações'}
            </Botao>
          </div>
        </form>
      </Secao>

      <Secao id="perfil" titulo="Perfil" descricao="Seu nome aparece no histórico de operações e na timeline.">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            dadosPerfil.enviar(e.currentTarget)
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome" name="nome" defaultValue={perfil.nome} required maxLength={80} />
            <Campo rotulo="E-mail" value={perfil.email ?? ''} disabled readOnly />
          </div>
          <div className="flex justify-end">
            <Botao type="submit" disabled={dadosPerfil.enviando}>
              {dadosPerfil.enviando ? 'Salvando…' : 'Salvar perfil'}
            </Botao>
          </div>
        </form>
      </Secao>

      <Secao id="conta" titulo="Usuário e segurança" descricao="Troque a senha de acesso. Use pelo menos 8 caracteres.">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            senha.enviar(e.currentTarget)
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nova senha" name="senha" type="password" autoComplete="new-password" minLength={8} required />
            <Campo rotulo="Confirmar nova senha" name="confirmacao" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="flex items-center justify-between gap-3">
            <a href="/sair" className="text-xs text-vermelho hover:underline">
              Sair da conta
            </a>
            <Botao type="submit" disabled={senha.enviando}>
              {senha.enviando ? 'Alterando…' : 'Alterar senha'}
            </Botao>
          </div>
        </form>
      </Secao>
    </div>
  )
}
