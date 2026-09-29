import { cx } from '@/components/ui'
import { formatarMoeda, type Centavos } from '@/lib/financeiro/dinheiro'
import { nomeDiaSemana, nomeMesCurto, type DataISO } from '@/lib/financeiro/datas'

/** Grade de vencimentos: um "cartãozinho de calendário" por parcela. */
export function CalendarioVencimentos({
  parcelas,
  total,
}: {
  parcelas: { numero: number; valor: Centavos; vencimento: DataISO }[]
  total: number
}) {
  return (
    <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {parcelas.map((p) => (
        <li
          key={p.numero}
          className={cx(
            'flex items-center gap-2 rounded-xl border border-borda bg-painel p-1.5',
            p.numero === 1 && 'border-azul/40 bg-azul-fundo/40',
          )}
        >
          <span className="grid w-9 shrink-0 place-items-center rounded-lg bg-painel-3 py-0.5 leading-none">
            <span className="text-[9px] font-semibold tracking-wider text-tinta-3 uppercase">{nomeMesCurto(p.vencimento)}</span>
            <span className="numeros text-sm font-semibold text-tinta">{p.vencimento.slice(8, 10)}</span>
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[10px] text-tinta-3">
              {p.numero}/{total} · {nomeDiaSemana(p.vencimento, true)}
            </span>
            <span className="numeros block truncate text-[11px] font-medium text-tinta-2">{formatarMoeda(p.valor)}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
