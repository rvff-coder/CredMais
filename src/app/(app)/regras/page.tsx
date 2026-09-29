import type { Metadata } from 'next'
import { History } from 'lucide-react'

import { Cabecalho } from '@/components/casca/cabecalho'
import { Cartao, EstadoVazio, Pilula, TituloSecao } from '@/components/ui'
import { formatarData, formatarHora, diaDoInstante, hojeBR } from '@/lib/financeiro/datas'
import { NOME_MODALIDADE, formatarPercentual } from '@/lib/financeiro/emprestimo'
import { limiaresDe, listarHistoricoRegras, obterConfiguracoes } from '@/lib/servicos/configuracoes'
import { exigirSessao } from '@/lib/servicos/sessao'

import { FormularioRegras } from './formulario'

export const metadata: Metadata = { title: 'Regras' }

export default async function PaginaRegras() {
  const { supabase } = await exigirSessao()
  const [config, historico] = await Promise.all([obterConfiguracoes(), listarHistoricoRegras(supabase)])

  return (
    <>
      <Cabecalho
        titulo="Regras"
        descricao="Limiares de juros aplicados aos novos empréstimos de cada modalidade."
      />

      <div className="space-y-6 px-4 pt-4 pb-10 sm:px-6 lg:px-8">
        <FormularioRegras atuais={limiaresDe(config)} hoje={hojeBR()} />

        <Cartao className="p-5">
          <TituloSecao>Histórico dos limiares</TituloSecao>
          {historico.length === 0 ? (
            <EstadoVazio
              icone={<History className="size-5" />}
              titulo="Nenhuma alteração registrada."
              descricao="Os limiares estão com os valores padrão: diário 35%, semanal 40% e mensal 50%."
              className="py-10"
            />
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-borda text-left text-[11px] font-medium tracking-wide text-tinta-4 uppercase">
                    <th className="py-2.5 pr-3 font-medium">Data</th>
                    <th className="py-2.5 pr-3 font-medium">Hora</th>
                    <th className="py-2.5 pr-3 font-medium">Regra</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Valor anterior</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Novo valor</th>
                    <th className="py-2.5 font-medium">Usuário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {historico.map((h) => (
                    <tr key={h.id}>
                      <td className="numeros py-2.5 pr-3">{formatarData(diaDoInstante(h.created_at))}</td>
                      <td className="numeros py-2.5 pr-3 text-tinta-2">{formatarHora(h.created_at)}</td>
                      <td className="py-2.5 pr-3">
                        <Pilula>{NOME_MODALIDADE[h.tipo_regra]}</Pilula>
                      </td>
                      <td className="numeros py-2.5 pr-3 text-right text-tinta-3">{formatarPercentual(h.valor_anterior)}</td>
                      <td className="numeros py-2.5 pr-3 text-right font-semibold">{formatarPercentual(h.valor_novo)}</td>
                      <td className="py-2.5 text-xs text-tinta-2">{h.usuario_nome ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      </div>
    </>
  )
}
