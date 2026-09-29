'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus } from 'lucide-react'

import { useAvisos } from '@/components/avisos'
import { CampoCnpj } from '@/components/campos'
import { Modal } from '@/components/modal'
import { AreaTexto, Botao, Campo, classesBotao } from '@/components/ui'
import { mudarStatusCliente, mudarStatusSocio, salvarCliente, salvarSocio } from '@/acoes/cadastros'
import { formatarData } from '@/lib/financeiro/datas'
import type { Cliente, Socio, StatusCadastro } from '@/lib/tipos'

type ClienteEditavel = Pick<Cliente, 'id' | 'nome' | 'cnpj' | 'contato' | 'observacoes' | 'data_cadastro'>

function ModalCliente({
  cliente,
  aoFechar,
  aoSalvar,
}: {
  cliente?: ClienteEditavel
  aoFechar: () => void
  aoSalvar?: (id: string) => void
}) {
  const avisos = useAvisos()
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [enviando, iniciar] = useTransition()

  function enviar(dados: FormData) {
    iniciar(async () => {
      const r = await salvarCliente(dados)
      if (!r.ok) {
        setCampos(r.campos ?? {})
        avisos.erro(r.erro)
        return
      }
      avisos.sucesso(r.mensagem)
      aoFechar()
      if (r.dados?.id) aoSalvar?.(r.dados.id)
    })
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      bloquearFechar={enviando}
      titulo={cliente ? 'Editar cliente' : 'Novo cliente'}
      descricao={cliente ? `Cadastrado em ${formatarData(cliente.data_cadastro)}` : 'Os dados podem ser editados depois.'}
    >
      <form action={enviar} className="space-y-4">
        {cliente && <input type="hidden" name="id" value={cliente.id} />}
        <Campo
          rotulo="Nome"
          name="nome"
          defaultValue={cliente?.nome}
          required
          maxLength={160}
          autoFocus
          placeholder="Razão social ou nome fantasia"
          erro={campos.nome}
        />
        <CampoCnpj name="cnpj" valorInicial={cliente?.cnpj} required erroServidor={campos.cnpj} />
        <Campo
          rotulo="Contato"
          name="contato"
          defaultValue={cliente?.contato}
          maxLength={160}
          placeholder="Telefone, WhatsApp ou e-mail"
        />
        <AreaTexto rotulo="Observações" name="observacoes" defaultValue={cliente?.observacoes} maxLength={2000} rows={3} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Botao variante="fantasma" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={enviando}>
            {enviando ? 'Salvando…' : cliente ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}

export function BotaoNovoCliente({
  tamanho = 'md',
  abrirAoSalvar = true,
  className,
  children,
}: {
  tamanho?: 'sm' | 'md' | 'lg'
  abrirAoSalvar?: boolean
  className?: string
  children?: ReactNode
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={classesBotao('primario', tamanho, className)}>
        {children ?? (
          <>
            Novo cliente <Plus className="size-4" aria-hidden />
          </>
        )}
      </button>
      {aberto && (
        <ModalCliente
          aoFechar={() => setAberto(false)}
          aoSalvar={abrirAoSalvar ? (id) => router.push(`/clientes?c=${id}`, { scroll: false }) : undefined}
        />
      )}
    </>
  )
}

export function BotaoEditarCliente({ cliente }: { cliente: ClienteEditavel }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={classesBotao('fantasma', 'sm')}>
        <Pencil className="size-3.5" aria-hidden /> Editar
      </button>
      {aberto && <ModalCliente cliente={cliente} aoFechar={() => setAberto(false)} />}
    </>
  )
}

/** Desativar/reativar com confirmação. Serve para cliente e sócio. */
function BotaoStatus({
  nome,
  status,
  tipo,
  alterar,
}: {
  nome: string
  status: StatusCadastro
  tipo: 'cliente' | 'sócio'
  alterar: (novo: StatusCadastro) => Promise<{ ok: true; mensagem: string } | { ok: false; erro: string }>
}) {
  const avisos = useAvisos()
  const [aberto, setAberto] = useState(false)
  const [enviando, iniciar] = useTransition()
  const desativar = status === 'ATIVO'

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={classesBotao('fantasma', 'sm', desativar ? 'hover:!text-vermelho' : 'hover:!text-verde')}
      >
        {desativar ? 'Desativar' : 'Reativar'}
      </button>
      {aberto && (
        <Modal
          aberto
          aoFechar={() => setAberto(false)}
          bloquearFechar={enviando}
          titulo={desativar ? `Desativar ${tipo}?` : `Reativar ${tipo}?`}
          descricao={
            desativar
              ? `${nome} deixará de aparecer nas seleções. O histórico${tipo === 'cliente' ? ', os empréstimos e as parcelas' : ''} continuam preservados.`
              : `${nome} voltará a ficar disponível.`
          }
          rodape={
            <>
              <Botao variante="fantasma" onClick={() => setAberto(false)} disabled={enviando}>
                Cancelar
              </Botao>
              <Botao
                variante={desativar ? 'perigo' : 'primario'}
                disabled={enviando}
                onClick={() =>
                  iniciar(async () => {
                    const r = await alterar(desativar ? 'INATIVO' : 'ATIVO')
                    if (r.ok) {
                      avisos.sucesso(r.mensagem)
                      setAberto(false)
                    } else avisos.erro(r.erro)
                  })
                }
              >
                {desativar ? 'Desativar' : 'Reativar'}
              </Botao>
            </>
          }
        >
          <span />
        </Modal>
      )}
    </>
  )
}

export function BotaoStatusCliente({ id, nome, status }: { id: string; nome: string; status: StatusCadastro }) {
  return <BotaoStatus nome={nome} status={status} tipo="cliente" alterar={(s) => mudarStatusCliente(id, s)} />
}

export function BotaoStatusSocio({ id, nome, status }: { id: string; nome: string; status: StatusCadastro }) {
  return <BotaoStatus nome={nome} status={status} tipo="sócio" alterar={(s) => mudarStatusSocio(id, s)} />
}

function ModalSocio({ socio, aoFechar }: { socio?: Socio; aoFechar: () => void }) {
  const avisos = useAvisos()
  const [enviando, iniciar] = useTransition()
  const [campos, setCampos] = useState<Record<string, string>>({})

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      bloquearFechar={enviando}
      titulo={socio ? 'Editar sócio' : 'Novo sócio'}
      descricao={socio ? undefined : 'Cadastre os dados de contato e a chave Pix.'}
    >
      <form
        action={(dados) =>
          iniciar(async () => {
            const r = await salvarSocio(dados)
            if (!r.ok) {
              setCampos(r.campos ?? {})
              return avisos.erro(r.erro)
            }
            avisos.sucesso(r.mensagem)
            aoFechar()
          })
        }
        className="space-y-4"
      >
        {socio && <input type="hidden" name="id" value={socio.id} />}
        <Campo rotulo="Nome" name="nome" defaultValue={socio?.nome} required maxLength={160} autoFocus erro={campos.nome} />
        <Campo
          rotulo="Telefone"
          name="telefone"
          type="tel"
          defaultValue={socio?.telefone}
          maxLength={40}
          placeholder="(00) 00000-0000"
        />
        <Campo
          rotulo="Chave Pix"
          name="chave_pix"
          defaultValue={socio?.chave_pix}
          maxLength={140}
          placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
        />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Botao variante="fantasma" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={enviando}>
            {enviando ? 'Salvando…' : socio ? 'Salvar alterações' : 'Cadastrar sócio'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}

export function BotaoNovoSocio() {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={classesBotao('primario', 'md')}>
        Novo sócio <Plus className="size-4" aria-hidden />
      </button>
      {aberto && <ModalSocio aoFechar={() => setAberto(false)} />}
    </>
  )
}

export function BotaoEditarSocio({ socio, children }: { socio: Socio; children?: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={classesBotao('fantasma', 'sm')}>
        {children ?? (
          <>
            <Pencil className="size-3.5" aria-hidden /> Editar
          </>
        )}
      </button>
      {aberto && <ModalSocio socio={socio} aoFechar={() => setAberto(false)} />}
    </>
  )
}
