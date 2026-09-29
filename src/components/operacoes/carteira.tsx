'use client'

import { useState, useTransition } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'

import { useAvisos } from '@/components/avisos'
import { CampoMoeda } from '@/components/campos'
import { Modal } from '@/components/modal'
import { AreaTexto, Botao, Campo, Dado, classesBotao } from '@/components/ui'
import { adicionarValor, fazerAcerto } from '@/acoes/carteira'
import { formatarMoeda, type Centavos } from '@/lib/financeiro/dinheiro'
import { formatarData, hojeBR } from '@/lib/financeiro/datas'

/**
 * Formulário de valor + data + observação, com uma segunda etapa de
 * confirmação antes de mexer na carteira. Serve para adição e acerto.
 */
function ModalValor({
  titulo,
  descricao,
  rotuloConfirmar,
  frase,
  saldoAtual,
  sinal,
  aoFechar,
  enviar,
}: {
  titulo: string
  descricao: string
  rotuloConfirmar: string
  frase: (valor: string) => string
  saldoAtual?: Centavos
  sinal: 1 | -1
  aoFechar: () => void
  enviar: (e: { valor: Centavos; data: string; observacao: string }) => Promise<boolean>
}) {
  const hoje = hojeBR()
  const [valor, setValor] = useState<Centavos | null>(null)
  const [data, setData] = useState(hoje)
  const [observacao, setObservacao] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [enviando, iniciar] = useTransition()

  const erroValor = !valor ? 'Informe um valor maior que zero.' : undefined
  const erroData = !data ? 'Informe a data.' : data > hoje ? 'A data não pode estar no futuro.' : undefined

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      bloquearFechar={enviando}
      titulo={titulo}
      descricao={confirmando && valor ? frase(formatarMoeda(valor)) : descricao}
      rodape={
        confirmando ? (
          <>
            <Botao variante="fantasma" onClick={() => setConfirmando(false)} disabled={enviando}>
              <ArrowLeft className="size-4" aria-hidden /> Voltar
            </Botao>
            <Botao
              onClick={() =>
                iniciar(async () => {
                  if (await enviar({ valor: valor!, data, observacao })) aoFechar()
                })
              }
              disabled={enviando}
            >
              {enviando ? 'Registrando…' : rotuloConfirmar}
            </Botao>
          </>
        ) : (
          <>
            <Botao variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao
              onClick={() => {
                setTentou(true)
                if (!erroValor && !erroData) setConfirmando(true)
              }}
            >
              Continuar
            </Botao>
          </>
        )
      }
    >
      {confirmando && valor ? (
        <dl className="rounded-2xl border border-borda bg-painel px-4 py-1.5">
          <Dado rotulo="Valor" destaque>
            {sinal > 0 ? '+ ' : '- '}
            {formatarMoeda(valor)}
          </Dado>
          <Dado rotulo="Data">{formatarData(data)}</Dado>
          {observacao && <Dado rotulo="Observação">{observacao}</Dado>}
          {saldoAtual !== undefined && (
            <>
              <Dado rotulo="Carteira atual">{formatarMoeda(saldoAtual)}</Dado>
              <Dado rotulo="Carteira depois" destaque>
                {formatarMoeda(saldoAtual + sinal * valor)}
              </Dado>
            </>
          )}
        </dl>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoMoeda
              rotulo="Valor"
              name="valor"
              autoFocus
              valorInicial={valor ? formatarMoeda(valor).replace(/^R\$\s?/, '') : ''}
              aoMudar={setValor}
              erro={tentou ? erroValor : undefined}
            />
            <Campo
              rotulo="Data"
              type="date"
              value={data}
              max={hoje}
              onChange={(e) => setData(e.target.value)}
              erro={tentou ? erroData : undefined}
            />
          </div>
          <AreaTexto
            rotulo="Observação"
            value={observacao}
            maxLength={500}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional"
            rows={2}
          />
          {sinal < 0 && saldoAtual !== undefined && valor !== null && valor > saldoAtual && (
            <p className="rounded-xl border border-ambar/30 bg-ambar-fundo px-3 py-2 text-xs text-ambar">
              Atenção: o acerto é maior que o saldo atual da carteira ({formatarMoeda(saldoAtual)}).
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

export function BotaoAdicionarValor({ saldo, tamanho = 'md' }: { saldo?: Centavos; tamanho?: 'sm' | 'md' }) {
  const avisos = useAvisos()
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={classesBotao('primario', tamanho)}>
        <Plus className="size-4" aria-hidden /> Adicionar valor
      </button>
      {aberto && (
        <ModalValor
          titulo="Adicionar valor"
          descricao="O valor entra na carteira e fica disponível para novos empréstimos."
          rotuloConfirmar="Adicionar à carteira"
          frase={(v) => `Confirmar a adição de ${v} à carteira?`}
          saldoAtual={saldo}
          sinal={1}
          aoFechar={() => setAberto(false)}
          enviar={async (e) => {
            const r = await adicionarValor(e)
            if (!r.ok) {
              avisos.erro(r.erro)
              return false
            }
            avisos.sucesso(r.mensagem)
            return true
          }}
        />
      )}
    </>
  )
}

export function BotaoAcerto({
  clienteId,
  clienteNome,
  saldo,
  tamanho = 'md',
}: {
  clienteId: string
  clienteNome: string
  saldo?: Centavos
  tamanho?: 'sm' | 'md'
}) {
  const avisos = useAvisos()
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={classesBotao('secundario', tamanho)}>
        Fazer acerto
      </button>
      {aberto && (
        <ModalValor
          titulo={`Acerto · ${clienteNome}`}
          descricao="O acerto é uma saída da carteira vinculada ao cliente. Não altera empréstimos nem parcelas."
          rotuloConfirmar="Confirmar acerto"
          frase={(v) => `Confirmar acerto de ${v} para ${clienteNome}?`}
          saldoAtual={saldo}
          sinal={-1}
          aoFechar={() => setAberto(false)}
          enviar={async (e) => {
            const r = await fazerAcerto({ ...e, clienteId })
            if (!r.ok) {
              avisos.erro(r.erro)
              return false
            }
            avisos.sucesso(r.mensagem)
            return true
          }}
        />
      )}
    </>
  )
}
