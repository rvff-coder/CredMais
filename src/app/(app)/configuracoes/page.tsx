import type { Metadata } from 'next'

import { Cabecalho } from '@/components/casca/cabecalho'
import { obterConfiguracoes } from '@/lib/servicos/configuracoes'
import { exigirSessao, obterPerfil } from '@/lib/servicos/sessao'

import { Formularios } from './formularios'

export const metadata: Metadata = { title: 'Configurações' }

export default async function PaginaConfiguracoes() {
  const { usuario } = await exigirSessao()
  const [config, perfil] = await Promise.all([obterConfiguracoes(), obterPerfil()])

  return (
    <>
      <Cabecalho titulo="Configurações" descricao="Dados do negócio, preferências, perfil e acesso." />
      <div className="px-4 pt-4 pb-10 sm:px-6 lg:px-8">
        <Formularios
          config={config}
          perfil={perfil ?? { id: usuario.id, nome: usuario.email ?? '', email: usuario.email ?? null }}
        />
      </div>
    </>
  )
}
