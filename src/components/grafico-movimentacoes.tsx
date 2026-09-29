'use client'

import { useMemo, useState } from 'react'

import { formatarMoeda, paraCentavos } from '@/lib/financeiro/dinheiro'
import { formatarData, formatarDataCurta, nomeMesCurto } from '@/lib/financeiro/datas'

/*
 * Barras agrupadas de entradas x saídas por período.
 *
 * Cores validadas (scripts de dataviz, modo escuro, superfície #161618):
 * azul e laranja passam banda de luminosidade, croma, separação para
 * daltonismo (ΔE ≥ 26) e contraste. Verde/vermelho foi evitado de propósito:
 * é o par que some para quem tem deuteranopia.
 */
const COR_ENTRADA = '#4f8ff7'
const COR_SAIDA = '#c97a1c'

type Ponto = { periodo: string; entradas: number; saidas: number }

function rotuloPeriodo(periodo: string, agrupar: 'dia' | 'mes') {
  return agrupar === 'mes' ? `${nomeMesCurto(periodo)}/${periodo.slice(2, 4)}` : formatarDataCurta(periodo)
}

/** Número redondo para o topo do eixo: 1, 2, 2.5 ou 5 × 10^n. */
function tetoRedondo(v: number) {
  if (v <= 0) return 100
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * exp) return m * exp
  return 10 * exp
}

function compacto(reais: number) {
  if (reais >= 1_000_000) return `${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (reais >= 1_000) return `${(reais / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

export function GraficoMovimentacoes({ pontos, agrupar }: { pontos: Ponto[]; agrupar: 'dia' | 'mes' }) {
  const [foco, setFoco] = useState<number | null>(null)

  const largura = 720
  const altura = 220
  const margem = { topo: 12, direita: 8, base: 26, esquerda: 52 }
  const areaL = largura - margem.esquerda - margem.direita
  const areaA = altura - margem.topo - margem.base

  const maximo = useMemo(() => tetoRedondo(Math.max(0, ...pontos.flatMap((p) => [p.entradas, p.saidas]))), [pontos])
  const temDados = pontos.some((p) => p.entradas > 0 || p.saidas > 0)

  const passo = areaL / Math.max(1, pontos.length)
  // Barras finas; com muitos dias, as duas colunas encostam mas mantêm a
  // fenda de 2px entre elas.
  const larguraBarra = Math.max(2, Math.min(14, (passo - 6) / 2))
  const y = (v: number) => margem.topo + areaA - (v / maximo) * areaA
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maximo)

  // Rótulos do eixo X sem sobreposição: no máximo ~8.
  const cadaQuantos = Math.max(1, Math.ceil(pontos.length / 8))

  const focado = foco !== null ? pontos[foco] : null

  return (
    <figure className="relative">
      <div className="mb-3 flex items-center gap-4 text-xs text-tinta-2" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: COR_ENTRADA }} /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: COR_SAIDA }} /> Saídas
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${largura} ${altura}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label="Gráfico de entradas e saídas da carteira por período"
          onMouseLeave={() => setFoco(null)}
        >
          {marcas.map((m) => (
            <g key={m}>
              <line
                x1={margem.esquerda}
                x2={largura - margem.direita}
                y1={y(m)}
                y2={y(m)}
                stroke="rgb(255 255 255 / 0.06)"
                strokeDasharray={m === 0 ? undefined : '2 4'}
              />
              <text x={margem.esquerda - 8} y={y(m)} dy="0.32em" textAnchor="end" className="fill-tinta-4 text-[10px]">
                {compacto(m)}
              </text>
            </g>
          ))}

          {pontos.map((p, i) => {
            const cx = margem.esquerda + passo * i + passo / 2
            const ativo = foco === i
            return (
              <g key={p.periodo}>
                {ativo && (
                  <rect
                    x={cx - passo / 2}
                    y={margem.topo}
                    width={passo}
                    height={areaA}
                    fill="rgb(255 255 255 / 0.04)"
                    rx={6}
                  />
                )}
                <Barra x={cx - larguraBarra - 1} topo={y(p.entradas)} base={y(0)} largura={larguraBarra} cor={COR_ENTRADA} apagada={foco !== null && !ativo} />
                <Barra x={cx + 1} topo={y(p.saidas)} base={y(0)} largura={larguraBarra} cor={COR_SAIDA} apagada={foco !== null && !ativo} />
                {i % cadaQuantos === 0 && (
                  <text x={cx} y={altura - 8} textAnchor="middle" className="fill-tinta-4 text-[10px]">
                    {rotuloPeriodo(p.periodo, agrupar)}
                  </text>
                )}
                {/* Alvo de hover maior que a barra. */}
                <rect
                  x={cx - passo / 2}
                  y={margem.topo}
                  width={passo}
                  height={areaA + margem.base}
                  fill="transparent"
                  onMouseEnter={() => setFoco(i)}
                  onTouchStart={() => setFoco(i)}
                />
              </g>
            )
          })}
        </svg>

        {focado && foco !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-44 -translate-x-1/2 rounded-xl border border-borda-forte bg-painel-3/95 px-3 py-2 text-xs shadow-xl shadow-black/50 backdrop-blur"
            style={{
              left: `${Math.min(85, Math.max(15, ((margem.esquerda + passo * foco + passo / 2) / largura) * 100))}%`,
            }}
          >
            <p className="mb-1 font-medium text-tinta">
              {agrupar === 'mes' ? rotuloPeriodo(focado.periodo, 'mes') : formatarData(focado.periodo)}
            </p>
            <p className="numeros flex items-center justify-between gap-4 text-tinta-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: COR_ENTRADA }} /> Entradas
              </span>
              {formatarMoeda(paraCentavos(focado.entradas))}
            </p>
            <p className="numeros flex items-center justify-between gap-4 text-tinta-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: COR_SAIDA }} /> Saídas
              </span>
              {formatarMoeda(paraCentavos(focado.saidas))}
            </p>
          </div>
        )}

        {!temDados && (
          <p className="absolute inset-0 grid place-items-center text-sm text-tinta-3">
            Nenhuma movimentação no período.
          </p>
        )}
      </div>

      {/* Mesmos dados em tabela, para leitor de tela. */}
      <table className="sr-only">
        <caption>Entradas e saídas por período</caption>
        <thead>
          <tr>
            <th>Período</th>
            <th>Entradas</th>
            <th>Saídas</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((p) => (
            <tr key={p.periodo}>
              <td>{agrupar === 'mes' ? rotuloPeriodo(p.periodo, 'mes') : formatarData(p.periodo)}</td>
              <td>{formatarMoeda(paraCentavos(p.entradas))}</td>
              <td>{formatarMoeda(paraCentavos(p.saidas))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/** Barra com o topo arredondado e a base reta, presa no eixo. */
function Barra({
  x,
  topo,
  base,
  largura,
  cor,
  apagada,
}: {
  x: number
  topo: number
  base: number
  largura: number
  cor: string
  apagada: boolean
}) {
  const h = base - topo
  if (h <= 0.5) return null
  const r = Math.min(4, largura / 2, h)
  const d = `M${x},${base} V${topo + r} Q${x},${topo} ${x + r},${topo} H${x + largura - r} Q${x + largura},${topo} ${x + largura},${topo + r} V${base} Z`
  return <path d={d} fill={cor} opacity={apagada ? 0.35 : 1} style={{ transition: 'opacity 120ms' }} />
}
