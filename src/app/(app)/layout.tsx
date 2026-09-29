import { Casca } from '@/components/casca/casca'
import { paraCentavos } from '@/lib/financeiro/dinheiro'
import { verificarAtrasos } from '@/lib/servicos/atrasos'
import { obterConfiguracoes } from '@/lib/servicos/configuracoes'
import { obterResumoPainel } from '@/lib/servicos/painel'
import { exigirSessao, obterPerfil } from '@/lib/servicos/sessao'

export default async function LayoutApp({ children }: LayoutProps<'/'>) {
  const { supabase, usuario } = await exigirSessao()

  // Antes de qualquer leitura: parcelas vencidas viram EM_ATRASO e ganham
  // evento na timeline.
  await verificarAtrasos(supabase)

  const [perfil, config, resumo] = await Promise.all([
    obterPerfil(),
    obterConfiguracoes(),
    obterResumoPainel(supabase),
  ])

  return (
    <Casca
      dados={{
        nomeSistema: config.nome_sistema,
        usuario: { nome: perfil?.nome ?? 'Usuário', email: perfil?.email ?? usuario.email ?? null },
        carteira: paraCentavos(resumo.carteira),
        atrasos: resumo.parcelas_atrasadas,
      }}
    >
      {children}
    </Casca>
  )
}
