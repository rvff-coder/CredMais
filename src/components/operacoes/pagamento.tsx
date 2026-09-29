'use client'

import { useRef, useState, useTransition } from 'react'
import { Clock, FileUp, Paperclip, X } from 'lucide-react'

import { useAvisos } from '@/components/avisos'
import { Modal } from '@/components/modal'
import { SeloParcela } from '@/components/status'
import { Botao, Dado, classesBotao, cx } from '@/components/ui'
import { anexarComprovanteAcao, receberParcela } from '@/acoes/pagamentos'
import { MENSAGEM_TAMANHO_COMPROVANTE, TAMANHO_MAXIMO_COMPROVANTE } from '@/lib/comprovante'
import { formatarMoeda, paraCentavos, type Centavos } from '@/lib/financeiro/dinheiro'
import { formatarData, type DataISO } from '@/lib/financeiro/datas'
import type { StatusParcela } from '@/lib/tipos'

export type ParcelaParaPagamento = {
  id: string
  numero: number
  total: number
  valor: Centavos
  vencimento: DataISO
  status: StatusParcela
  clienteNome: string
  emprestimoCodigo: number
}

const TIPOS_ACEITOS = 'image/jpeg,image/png,image/webp,application/pdf'

/**
 * Botão de recebimento de uma parcela. Antes do vencimento aparece
 * desabilitado ("Aguardando vencimento"); a partir do dia, abre o modal.
 */
export function BotaoPagamento({
  parcela,
  hoje,
  tamanho = 'md',
  className,
}: {
  parcela: ParcelaParaPagamento
  hoje: DataISO
  tamanho?: 'sm' | 'md'
  className?: string
}) {
  const [aberto, setAberto] = useState(false)

  if (parcela.status === 'PAGO') return null

  if (parcela.vencimento > hoje) {
    return (
      <span
        className={cx(classesBotao('secundario', tamanho, className), 'cursor-not-allowed opacity-60')}
        title={`Disponível em ${formatarData(parcela.vencimento)}`}
      >
        <Clock className="size-3.5" aria-hidden /> Aguardando vencimento
      </span>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={classesBotao('primario', tamanho, className)}>
        Confirmar pagamento
      </button>
      {aberto && <ModalPagamento parcela={parcela} aoFechar={() => setAberto(false)} />}
    </>
  )
}

function ModalPagamento({ parcela, aoFechar }: { parcela: ParcelaParaPagamento; aoFechar: () => void }) {
  const avisos = useAvisos()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, iniciar] = useTransition()

  function receber() {
    const dados = new FormData()
    dados.set('parcelaId', parcela.id)
    if (arquivo) dados.set('comprovante', arquivo)

    iniciar(async () => {
      const r = await receberParcela(dados)
      if (!r.ok) {
        avisos.erro(r.erro)
        // Já recebida (por outra aba/pessoa): não há o que fazer aqui.
        if (/já foi recebida/.test(r.erro)) aoFechar()
        return
      }
      avisos.sucesso(r.mensagem)
      const p = r.dados
      if (p && !p.finalizado && p.proxima_numero && p.proxima_vencimento) {
        avisos.sucesso(
          `Próximo pagamento: parcela ${p.proxima_numero}/${parcela.total} de ` +
            `${formatarMoeda(paraCentavos(p.proxima_valor))}, vence em ${formatarData(p.proxima_vencimento)}.`,
        )
      }
      aoFechar()
    })
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      bloquearFechar={enviando}
      titulo="Confirmar pagamento"
      descricao={`Confirmar recebimento de ${formatarMoeda(parcela.valor)}?`}
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao variante="sucesso" onClick={receber} disabled={enviando}>
            {enviando ? 'Registrando…' : 'Recebido 💵'}
          </Botao>
        </>
      }
    >
      <div className="space-y-5">
        <dl className="rounded-2xl border border-borda bg-painel px-4 py-1.5">
          <Dado rotulo="Cliente">{parcela.clienteNome}</Dado>
          <Dado rotulo="Empréstimo">#{parcela.emprestimoCodigo}</Dado>
          <Dado rotulo="Parcela">
            {parcela.numero}/{parcela.total}
          </Dado>
          <Dado rotulo="Valor" destaque>
            {formatarMoeda(parcela.valor)}
          </Dado>
          <Dado rotulo="Vencimento">{formatarData(parcela.vencimento)}</Dado>
          <Dado rotulo="Status">
            <SeloParcela status={parcela.status} />
          </Dado>
        </dl>

        <CampoArquivo arquivo={arquivo} aoMudar={setArquivo} rotulo="Comprovante de pagamento" />
      </div>
    </Modal>
  )
}

function CampoArquivo({
  arquivo,
  aoMudar,
  rotulo,
}: {
  arquivo: File | null
  aoMudar: (f: File | null) => void
  rotulo: string
}) {
  const [erro, setErro] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  return (
    <div>
      <p className="mb-1.5 flex items-baseline justify-between text-xs font-medium text-tinta-2">
        {rotulo} <span className="text-[11px] font-normal text-tinta-4">opcional · JPG, PNG, WEBP ou PDF até 4 MB</span>
      </p>
      {arquivo ? (
        <div className="flex items-center gap-3 rounded-2xl border border-borda bg-painel px-4 py-3">
          <Paperclip className="size-4 shrink-0 text-azul-claro" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm">{arquivo.name}</span>
          <span className="numeros text-[11px] text-tinta-3">{(arquivo.size / 1024).toFixed(0)} KB</span>
          <button
            type="button"
            onClick={() => {
              aoMudar(null)
              if (entrada.current) entrada.current.value = ''
            }}
            className="rounded-md p-1 text-tinta-3 hover:bg-painel-4 hover:text-tinta"
            aria-label="Remover arquivo"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed border-borda-forte
                     bg-painel px-4 py-6 text-center transition-colors hover:border-azul/50 hover:bg-painel-3"
        >
          <FileUp className="size-5 text-tinta-3" aria-hidden />
          <span className="text-sm text-tinta-2">Anexar comprovante</span>
        </button>
      )}
      <input
        ref={entrada}
        type="file"
        accept={TIPOS_ACEITOS}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          if (f && f.size > TAMANHO_MAXIMO_COMPROVANTE) {
            setErro(MENSAGEM_TAMANHO_COMPROVANTE)
            e.target.value = ''
            return
          }
          setErro(null)
          aoMudar(f)
        }}
      />
      {erro && <p className="mt-1.5 text-xs text-vermelho">{erro}</p>}
    </div>
  )
}

/** Para parcela já paga sem comprovante. */
export function BotaoAnexarComprovante({ parcelaId, rotulo }: { parcelaId: string; rotulo: string }) {
  const avisos = useAvisos()
  const [aberto, setAberto] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, iniciar] = useTransition()

  function enviar() {
    if (!arquivo) return
    const dados = new FormData()
    dados.set('parcelaId', parcelaId)
    dados.set('comprovante', arquivo)
    iniciar(async () => {
      const r = await anexarComprovanteAcao(dados)
      if (!r.ok) return avisos.erro(r.erro)
      avisos.sucesso(r.mensagem)
      setAberto(false)
      setArquivo(null)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1 text-xs text-tinta-3 transition-colors hover:text-azul-claro"
      >
        <FileUp className="size-3.5" aria-hidden /> Anexar
      </button>
      {aberto && (
        <Modal
          aberto
          aoFechar={() => setAberto(false)}
          bloquearFechar={enviando}
          titulo="Anexar comprovante"
          descricao={rotulo}
          rodape={
            <>
              <Botao variante="fantasma" onClick={() => setAberto(false)} disabled={enviando}>
                Cancelar
              </Botao>
              <Botao onClick={enviar} disabled={!arquivo || enviando}>
                {enviando ? 'Enviando…' : 'Anexar comprovante'}
              </Botao>
            </>
          }
        >
          <CampoArquivo arquivo={arquivo} aoMudar={setArquivo} rotulo="Arquivo" />
        </Modal>
      )}
    </>
  )
}
