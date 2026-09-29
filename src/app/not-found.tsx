import { Marca } from '@/components/casca/logo'
import { BotaoLink } from '@/components/ui'

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Marca className="size-10" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <p className="text-sm text-tinta-3">O endereço não existe ou o registro foi removido.</p>
      </div>
      <BotaoLink href="/">Voltar ao dashboard</BotaoLink>
    </div>
  )
}
