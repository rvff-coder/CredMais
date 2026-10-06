'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CalendarDays, Wallet } from 'lucide-react'

import { useAvisos } from '@/components/avisos'
import { CampoMoeda, Selecao } from '@/components/campos'
import { Modal } from '@/components/modal'
import { CalendarioVencimentos } from '@/components/operacoes/calendario'
import { AreaTexto, Botao, Campo, Dado, Rotulo, classesBotao, cx } from '@/components/ui'
import {
  carregarDadosParaEmprestimo,
  confirmarEmprestimo,
  type DadosParaEmprestimo,
  type FalhaSaldo,
} from '@/acoes/emprestimos'
import { EMPRESTIMO_MINIMO, formatarMoeda, type Centavos } from '@/lib/financeiro/dinheiro'
import { formatarData } from '@/lib/financeiro/datas'
import {
  DESCRICAO_MODALIDADE,
  MODALIDADES,
  NOME_MODALIDADE,
  calcularEmprestimo,
  formatarPercentual,
  type Modalidade,
} from '@/lib/financeiro/emprestimo'
import { formatarDocumento } from '@/lib/validacao/documento'

type Props = {
  clienteId?: string
  clienteNome?: string
  rotulo?: string
  tamanho?: 'sm' | 'md' | 'lg'
  variante?: 'primario' | 'secundario'
  className?: string
  desabilitado?: boolean
}

/** Botão "Emprestar 💸" + modal de criação. Serve em qualquer tela. */
export function BotaoEmprestar({
  clienteId,
  clienteNome,
  rotulo = 'Emprestar 💸',
  tamanho = 'md',
  variante = 'primario',
  className,
  desabilitado,
}: Props) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => setAberto(true)}
        className={classesBotao(variante, tamanho, className)}
      >
        {rotulo}
      </button>
      {aberto && (
        <ModalEmprestar clienteId={clienteId} clienteNome={clienteNome} aoFechar={() => setAberto(false)} />
      )}
    </>
  )
}

function ModalEmprestar({
  clienteId: clienteFixo,
  clienteNome,
  aoFechar,
}: {
  clienteId?: string
  clienteNome?: string
  aoFechar: () => void
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [dados, setDados] = useState<DadosParaEmprestimo | null>(null)
  const [carregando, iniciarCarga] = useTransition()
  const [enviando, iniciarEnvio] = useTransition()

  const [etapa, setEtapa] = useState<'form' | 'resumo'>('form')
  const [clienteId, setClienteId] = useState(clienteFixo ?? '')
  const [valor, setValor] = useState<Centavos | null>(null)
  const [modalidade, setModalidade] = useState<Modalidade | ''>('')
  const [data, setData] = useState('')
  const [observacao, setObservacao] = useState('')
  const [falhaSaldo, setFalhaSaldo] = useState<FalhaSaldo | null>(null)
  const [tentouAvancar, setTentouAvancar] = useState(false)

  // Saldo, limiares e clientes são lidos quando o modal abre, não quando a
  // página carregou: podem ter mudado desde então.
  useEffect(() => {
    let ativo = true
    iniciarCarga(async () => {
      const d = await carregarDadosParaEmprestimo(!clienteFixo)
      if (!ativo) return
      if (!d) {
        avisos.erro('Sua sessão expirou. Entre novamente.')
        aoFechar()
        return
      }
      setDados(d)
      setData(d.hoje)
    })
    return () => {
      ativo = false
    }
    // Só na abertura do modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const calculo = useMemo(() => {
    if (!dados || !valor || !modalidade || !data || valor < EMPRESTIMO_MINIMO) return null
    return calcularEmprestimo(valor, modalidade, dados.limiares[modalidade], data)
  }, [dados, valor, modalidade, data])

  const nomeCliente =
    clienteNome ?? dados?.clientes.find((c) => c.id === clienteId)?.nome ?? ''
  const saldo = dados?.saldo ?? 0
  const semSaldo = valor !== null && valor > saldo
  const falta = valor !== null ? Math.max(0, valor - saldo) : 0

  const erros = {
    cliente: !clienteId ? 'Selecione o cliente.' : undefined,
    valor: !valor
      ? 'Informe o valor do empréstimo.'
      : valor < EMPRESTIMO_MINIMO
        ? 'O valor mínimo é R$ 10,00.'
        : undefined,
    modalidade: !modalidade ? 'Escolha a modalidade.' : undefined,
    data: !data ? 'Informe a data.' : dados && data > dados.hoje ? 'A data não pode estar no futuro.' : undefined,
  }
  const valido = !erros.cliente && !erros.valor && !erros.modalidade && !erros.data && !semSaldo

  function avancar() {
    setTentouAvancar(true)
    if (valido && calculo) setEtapa('resumo')
  }

  function confirmar() {
    if (!calculo || !modalidade || !valor) return
    iniciarEnvio(async () => {
      const r = await confirmarEmprestimo({
        clienteId,
        valor,
        modalidade,
        data,
        observacao,
        limiarEsperado: calculo.limiar,
      })
      if (r.ok) {
        avisos.sucesso(r.mensagem)
        aoFechar()
        if (r.dados?.id) router.push(`/emprestimos/${r.dados.id}`)
        return
      }
      avisos.erro(r.erro)
      if (r.saldoInsuficiente) {
        setFalhaSaldo(r.saldoInsuficiente)
        setDados((d) => (d ? { ...d, saldo: r.saldoInsuficiente!.saldo } : d))
        setEtapa('form')
      }
      if (r.limiarAlterado) {
        // Recarrega os limiares e devolve para revisão.
        const d = await carregarDadosParaEmprestimo(!clienteFixo)
        if (d) setDados(d)
        setEtapa('form')
      }
    })
  }

  const erro = (campo: keyof typeof erros) => (tentouAvancar ? erros[campo] : undefined)

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      bloquearFechar={enviando}
      largura="max-w-2xl"
      titulo={etapa === 'form' ? 'Novo empréstimo' : 'Confirmar empréstimo'}
      descricao={
        etapa === 'form'
          ? 'Os juros e as parcelas são calculados com o limiar vigente.'
          : 'Revise os valores antes de confirmar. Esta operação retira o valor da carteira.'
      }
      rodape={
        etapa === 'form' ? (
          <>
            <Botao variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao onClick={avancar} disabled={carregando || !dados}>
              Revisar empréstimo
            </Botao>
          </>
        ) : (
          <>
            <Botao variante="fantasma" onClick={() => setEtapa('form')} disabled={enviando}>
              <ArrowLeft className="size-4" aria-hidden /> Voltar
            </Botao>
            <Botao onClick={confirmar} disabled={enviando}>
              {enviando ? 'Confirmando…' : 'Confirmar empréstimo'}
            </Botao>
          </>
        )
      }
    >
      {!dados ? (
        <div className="space-y-3 py-6" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-painel-3" />
          ))}
        </div>
      ) : etapa === 'form' ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-borda bg-painel px-4 py-3">
            <span className="flex items-center gap-2 text-xs text-tinta-3">
              <Wallet className="size-4" aria-hidden /> Carteira disponível
            </span>
            <span className="numeros text-sm font-semibold">{formatarMoeda(saldo)}</span>
          </div>

          {clienteFixo ? (
            <div className="flex flex-col gap-1.5">
              <Rotulo>Cliente</Rotulo>
              <p className="rounded-xl border border-borda bg-painel px-3.5 py-2.5 text-sm">{clienteNome}</p>
            </div>
          ) : (
            <div>
              <Selecao
                rotulo="Cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                aria-invalid={erro('cliente') ? true : undefined}
              >
                <option value="">Selecione o cliente…</option>
                {dados.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {formatarDocumento(c.cnpj)}
                  </option>
                ))}
              </Selecao>
              {erro('cliente') && <p className="mt-1.5 text-xs text-vermelho">{erro('cliente')}</p>}
              {dados.clientes.length === 0 && (
                <p className="mt-1.5 text-xs text-tinta-3">Nenhum cliente ativo. Cadastre um cliente primeiro.</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoMoeda
              rotulo="Valor do empréstimo"
              name="valor"
              autoFocus
              aoMudar={(v) => {
                setValor(v)
                setFalhaSaldo(null)
              }}
              erro={erro('valor')}
            />
            <Campo
              rotulo="Data do empréstimo"
              type="date"
              value={data}
              max={dados.hoje}
              onChange={(e) => setData(e.target.value)}
              erro={erro('data')}
            />
          </div>

          {semSaldo && valor !== null && (
            <AvisoSaldo saldo={falhaSaldo?.saldo ?? saldo} solicitado={valor} falta={falta} />
          )}

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-tinta-2">Modalidade</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {MODALIDADES.map((m) => (
                <label
                  key={m}
                  className={cx(
                    'relative flex cursor-pointer flex-col gap-1 rounded-2xl border p-3.5 transition-all',
                    modalidade === m
                      ? 'border-azul bg-azul-fundo'
                      : 'border-borda bg-painel hover:border-borda-forte hover:bg-painel-3',
                  )}
                >
                  <input
                    type="radio"
                    name="modalidade"
                    value={m}
                    checked={modalidade === m}
                    onChange={() => setModalidade(m)}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{NOME_MODALIDADE[m]}</span>
                    <span className="numeros rounded-md bg-painel-4 px-1.5 py-0.5 text-[11px] font-semibold text-tinta-2">
                      {formatarPercentual(dados.limiares[m])}
                    </span>
                  </span>
                  <span className="text-[11px] leading-snug text-tinta-3">{DESCRICAO_MODALIDADE[m]}</span>
                </label>
              ))}
            </div>
            {erro('modalidade') && <p className="mt-1.5 text-xs text-vermelho">{erro('modalidade')}</p>}
          </fieldset>

          {calculo && (
            <div className="animate-subir rounded-2xl border border-borda bg-painel p-4">
              <p className="mb-2 text-[11px] font-semibold tracking-wider text-tinta-3 uppercase">Cálculo</p>
              <dl className="grid gap-x-6 sm:grid-cols-2">
                <Dado rotulo="Limiar">{formatarPercentual(calculo.limiar)}</Dado>
                <Dado rotulo="Juros">{formatarMoeda(calculo.juros)}</Dado>
                <Dado rotulo="Total a receber" destaque>
                  {formatarMoeda(calculo.total)}
                </Dado>
                <Dado rotulo="Parcelas">
                  {calculo.quantidade}× {formatarMoeda(calculo.valorParcelaBase)}
                </Dado>
                <Dado rotulo="Primeiro vencimento">{formatarData(calculo.parcelas[0].vencimento)}</Dado>
                <Dado rotulo="Último vencimento">
                  {formatarData(calculo.parcelas[calculo.parcelas.length - 1].vencimento)}
                </Dado>
              </dl>
            </div>
          )}

          <AreaTexto
            rotulo="Observações"
            value={observacao}
            maxLength={2000}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional"
            rows={2}
          />
        </div>
      ) : (
        calculo && (
          <div className="space-y-5">
            <p className="rounded-2xl border border-azul/30 bg-azul-fundo px-4 py-3 text-sm leading-relaxed text-tinta">
              Você está prestes a emprestar <strong className="numeros">{formatarMoeda(calculo.principal)}</strong> para{' '}
              <strong>{nomeCliente}</strong>. Total a receber{' '}
              <strong className="numeros">{formatarMoeda(calculo.total)}</strong> em {calculo.quantidade}{' '}
              {calculo.quantidade === 1 ? 'parcela' : 'parcelas'} de{' '}
              <strong className="numeros">{formatarMoeda(calculo.valorParcelaBase)}</strong>. Deseja continuar?
            </p>

            <dl className="grid gap-x-8 rounded-2xl border border-borda bg-painel px-4 py-2 sm:grid-cols-2">
              <Dado rotulo="Cliente">{nomeCliente}</Dado>
              <Dado rotulo="Valor emprestado" destaque>
                {formatarMoeda(calculo.principal)}
              </Dado>
              <Dado rotulo="Modalidade">{NOME_MODALIDADE[calculo.modalidade]}</Dado>
              <Dado rotulo="Limiar">{formatarPercentual(calculo.limiar)}</Dado>
              <Dado rotulo="Juros">{formatarMoeda(calculo.juros)}</Dado>
              <Dado rotulo="Total a receber" destaque>
                {formatarMoeda(calculo.total)}
              </Dado>
              <Dado rotulo="Número de parcelas">{calculo.quantidade}</Dado>
              <Dado rotulo="Valor das parcelas">
                {formatarMoeda(calculo.valorParcelaBase)}
                {calculo.parcelas[calculo.quantidade - 1].valor !== calculo.valorParcelaBase && (
                  <span className="block text-[11px] text-tinta-3">
                    última: {formatarMoeda(calculo.parcelas[calculo.quantidade - 1].valor)}
                  </span>
                )}
              </Dado>
              <Dado rotulo="Data do empréstimo">{formatarData(data)}</Dado>
              <Dado rotulo="Primeiro vencimento">{formatarData(calculo.parcelas[0].vencimento)}</Dado>
            </dl>

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-tinta-2">
                <CalendarDays className="size-4" aria-hidden /> Calendário de vencimentos
              </p>
              <CalendarioVencimentos parcelas={calculo.parcelas} total={calculo.quantidade} />
              {calculo.modalidade === 'DIARIO' && (
                <p className="mt-2 text-[11px] text-tinta-3">Domingos não possuem pagamento.</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-borda bg-painel px-4 py-3 text-xs">
              <span className="text-tinta-3">Carteira após o empréstimo</span>
              <span className="numeros font-semibold">{formatarMoeda(saldo - calculo.principal)}</span>
            </div>
          </div>
        )
      )}
    </Modal>
  )
}

function AvisoSaldo({ saldo, solicitado, falta }: { saldo: Centavos; solicitado: Centavos; falta: Centavos }) {
  return (
    <div role="alert" className="animate-subir rounded-2xl border border-vermelho/30 bg-vermelho-fundo p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-vermelho">
        <AlertTriangle className="size-4" aria-hidden /> Saldo insuficiente na carteira.
      </p>
      <dl className="mt-2 grid grid-cols-3 gap-3 text-xs">
        <div>
          <dt className="text-tinta-3">Carteira disponível</dt>
          <dd className="numeros mt-0.5 font-semibold text-tinta">{formatarMoeda(saldo)}</dd>
        </div>
        <div>
          <dt className="text-tinta-3">Valor solicitado</dt>
          <dd className="numeros mt-0.5 font-semibold text-tinta">{formatarMoeda(solicitado)}</dd>
        </div>
        <div>
          <dt className="text-tinta-3">Falta</dt>
          <dd className="numeros mt-0.5 font-semibold text-vermelho">{formatarMoeda(falta)}</dd>
        </div>
      </dl>
    </div>
  )
}
