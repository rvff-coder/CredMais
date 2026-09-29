import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

import { CATEGORIA } from '@/components/status'
import { Pilula, cx } from '@/components/ui'
import { formatarMoedaComSinal, paraCentavos } from '@/lib/financeiro/dinheiro'
import { diaDoInstante, formatarData, formatarHora } from '@/lib/financeiro/datas'
import type { Movimentacao } from '@/lib/tipos'

export function tituloMovimentacao(m: Movimentacao) {
  switch (m.categoria) {
    case 'RECEBIMENTO_DE_PARCELA':
      return m.numero_parcela ? `Pagamento parcela ${m.numero_parcela}/${m.quantidade_parcelas}` : 'Pagamento de parcela'
    case 'EMPRESTIMO':
      return 'Novo empréstimo'
    case 'ACERTO':
      return 'Acerto'
    case 'ADICAO_DE_VALOR':
      return 'Adição de valor'
  }
}

/** Linha compacta: sinal, valor, o que foi e de quem. */
export function ItemMovimentacao({ m }: { m: Movimentacao }) {
  const entrada = m.tipo === 'ENTRADA'
  const Icone = entrada ? ArrowDownLeft : ArrowUpRight
  const alvo = m.emprestimo_id ? `/emprestimos/${m.emprestimo_id}` : m.cliente_id ? `/clientes?c=${m.cliente_id}` : null

  const conteudo = (
    <>
      <span
        className={cx(
          'grid size-9 shrink-0 place-items-center rounded-full',
          entrada ? 'bg-verde-fundo text-verde' : 'bg-painel-4 text-tinta-2',
        )}
      >
        <Icone className="size-4" aria-hidden />
        <span className="sr-only">{entrada ? 'Entrada' : 'Saída'}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-tinta">{tituloMovimentacao(m)}</span>
        <span className="block truncate text-xs text-tinta-3">
          {m.cliente_nome ?? (m.categoria === 'ADICAO_DE_VALOR' ? m.descricao : CATEGORIA[m.categoria])}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={cx('numeros text-sm font-semibold', entrada ? 'text-verde' : 'text-tinta')}>
          {formatarMoedaComSinal(paraCentavos(m.valor), entrada ? '+' : '-')}
        </span>
        <Pilula>
          {formatarData(diaDoInstante(m.created_at)).slice(0, 5)} {formatarHora(m.created_at)}
        </Pilula>
      </span>
    </>
  )

  const classe = 'flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors'
  return alvo ? (
    <Link href={alvo} className={cx(classe, 'hover:bg-painel-2')}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}
