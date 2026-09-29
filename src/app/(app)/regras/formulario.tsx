'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, CalendarRange, Info, Sun } from 'lucide-react'

import { useAvisos } from '@/components/avisos'
import { Modal } from '@/components/modal'
import { Botao, cx } from '@/components/ui'
import { salvarLimiares } from '@/acoes/ajustes'
import { formatarMoeda } from '@/lib/financeiro/dinheiro'
import {
  DESCRICAO_MODALIDADE,
  MODALIDADES,
  NOME_MODALIDADE,
  calcularEmprestimo,
  formatarPercentual,
  type Limiares,
  type Modalidade,
} from '@/lib/financeiro/emprestimo'

const ICONES = { DIARIO: Sun, SEMANAL: CalendarDays, MENSAL: CalendarRange }
const EXEMPLO = 100000 // R$ 1.000,00

function ler(texto: string): number | null {
  const t = texto.replace('%', '').replace(',', '.').trim()
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(t)) return null
  const n = Number(t)
  return n <= 1000 ? n : null
}

function paraTexto(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function FormularioRegras({ atuais, hoje }: { atuais: Limiares; hoje: string }) {
  const avisos = useAvisos()
  const [textos, setTextos] = useState<Record<Modalidade, string>>({
    DIARIO: paraTexto(atuais.DIARIO),
    SEMANAL: paraTexto(atuais.SEMANAL),
    MENSAL: paraTexto(atuais.MENSAL),
  })
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, iniciar] = useTransition()

  // Quando o servidor devolve novos valores (após salvar), recomeça deles.
  const [base, setBase] = useState(atuais)
  if (base.DIARIO !== atuais.DIARIO || base.SEMANAL !== atuais.SEMANAL || base.MENSAL !== atuais.MENSAL) {
    setBase(atuais)
    setTextos({ DIARIO: paraTexto(atuais.DIARIO), SEMANAL: paraTexto(atuais.SEMANAL), MENSAL: paraTexto(atuais.MENSAL) })
  }

  const valores = Object.fromEntries(MODALIDADES.map((m) => [m, ler(textos[m])])) as Record<Modalidade, number | null>
  const validos = MODALIDADES.every((m) => valores[m] !== null)
  const alteradas = MODALIDADES.filter((m) => valores[m] !== null && valores[m] !== atuais[m])

  function salvar() {
    const dados = new FormData()
    for (const m of MODALIDADES) dados.set(m, textos[m])
    iniciar(async () => {
      const r = await salvarLimiares(dados)
      if (!r.ok) return avisos.erro(r.erro)
      avisos.sucesso(r.mensagem)
      setConfirmando(false)
    })
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {MODALIDADES.map((m) => {
          const Icone = ICONES[m]
          const v = valores[m]
          const exemplo = v !== null ? calcularEmprestimo(EXEMPLO, m, v, hoje) : null
          const mudou = v !== null && v !== atuais[m]
          return (
            <div
              key={m}
              className={cx(
                'rounded-cartao border bg-painel p-5 transition-colors',
                mudou ? 'border-azul/50' : 'border-borda',
                v === null && 'border-vermelho/50',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-painel-3 text-tinta-2">
                    <Icone className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">Limiar {NOME_MODALIDADE[m].toLowerCase()}</span>
                    <span className="block text-[11px] text-tinta-3">{DESCRICAO_MODALIDADE[m]}</span>
                  </span>
                </span>
              </div>

              <label className="mt-5 block">
                <span className="sr-only">Percentual {NOME_MODALIDADE[m]}</span>
                <span className="relative block">
                  <input
                    value={textos[m]}
                    onChange={(e) => setTextos((t) => ({ ...t, [m]: e.target.value }))}
                    inputMode="decimal"
                    aria-invalid={v === null ? true : undefined}
                    className="numeros h-16 w-full rounded-2xl border border-borda bg-painel-2 pr-12 pl-4 text-3xl font-semibold tracking-tight transition-colors focus:border-azul focus:outline-none"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-2xl font-semibold text-tinta-3">
                    %
                  </span>
                </span>
              </label>
              {v === null && <p className="mt-1.5 text-xs text-vermelho">Use um número de 0 a 1000, com até 2 casas.</p>}
              {mudou && (
                <p className="mt-1.5 text-xs text-azul-claro">
                  Atual: {formatarPercentual(atuais[m])} → novo: {formatarPercentual(v)}
                </p>
              )}

              {exemplo && (
                <dl className="numeros mt-4 space-y-1 rounded-xl bg-painel-2 px-3 py-2.5 text-xs">
                  <p className="mb-1 text-[10px] font-semibold tracking-wider text-tinta-4 uppercase">Exemplo com R$ 1.000,00</p>
                  <div className="flex justify-between">
                    <dt className="text-tinta-3">Juros</dt>
                    <dd>{formatarMoeda(exemplo.juros)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-tinta-3">Total</dt>
                    <dd>{formatarMoeda(exemplo.total)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-tinta-3">Parcelas</dt>
                    <dd className="font-medium text-tinta">
                      {exemplo.quantidade}× {formatarMoeda(exemplo.valorParcelaBase)}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-cartao border border-borda bg-painel px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-tinta-3">
          <Info className="mt-0.5 size-4 shrink-0 text-azul-claro" aria-hidden />
          Os novos valores valem somente para novos empréstimos. Empréstimos já criados mantêm o limiar gravado na
          criação e nunca são recalculados.
        </p>
        <Botao onClick={() => setConfirmando(true)} disabled={!validos || alteradas.length === 0}>
          Salvar regras
        </Botao>
      </div>

      {confirmando && (
        <Modal
          aberto
          aoFechar={() => setConfirmando(false)}
          bloquearFechar={enviando}
          titulo="Atualizar limiares?"
          descricao="As alterações ficam registradas no histórico com seu usuário."
          rodape={
            <>
              <Botao variante="fantasma" onClick={() => setConfirmando(false)} disabled={enviando}>
                Cancelar
              </Botao>
              <Botao onClick={salvar} disabled={enviando}>
                {enviando ? 'Salvando…' : 'Confirmar alteração'}
              </Botao>
            </>
          }
        >
          <ul className="space-y-2">
            {alteradas.map((m) => (
              <li key={m} className="numeros flex items-center justify-between rounded-xl bg-painel px-4 py-3 text-sm">
                <span className="text-tinta-2">{NOME_MODALIDADE[m]}</span>
                <span>
                  <span className="text-tinta-3 line-through">{formatarPercentual(atuais[m])}</span>
                  <span className="mx-2 text-tinta-4">→</span>
                  <span className="font-semibold">{formatarPercentual(valores[m]!)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  )
}
