'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  ChevronRight,
  HandCoins,
  LayoutGrid,
  LogOut,
  Menu,
  Percent,
  Search,
  Settings,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'

import { Logo } from '@/components/casca/logo'
import { BotaoEmprestar } from '@/components/operacoes/emprestar'
import { Avatar, cx } from '@/components/ui'
import { sair } from '@/acoes/ajustes'
import { formatarMoeda, type Centavos } from '@/lib/financeiro/dinheiro'

const ITENS = [
  { href: '/', rotulo: 'Dashboard', icone: LayoutGrid },
  { href: '/clientes', rotulo: 'Clientes', icone: Users },
  { href: '/emprestimos', rotulo: 'Empréstimos', icone: HandCoins },
  { href: '/carteira', rotulo: 'Carteira', icone: Wallet },
  { href: '/socios', rotulo: 'Sócios', icone: UsersRound },
  { href: '/regras', rotulo: 'Regras', icone: Percent },
  { href: '/configuracoes', rotulo: 'Configurações', icone: Settings },
]

export type DadosCasca = {
  nomeSistema: string
  usuario: { nome: string; email: string | null }
  carteira: Centavos
  atrasos: number
}

export function Casca({ dados, children }: { dados: DadosCasca; children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false)
  const caminho = usePathname()

  // Navegou: fecha o drawer.
  const [caminhoAnterior, setCaminhoAnterior] = useState(caminho)
  if (caminho !== caminhoAnterior) {
    setCaminhoAnterior(caminho)
    setMenuAberto(false)
  }

  useEffect(() => {
    if (!menuAberto) return
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAberto(false)
    document.addEventListener('keydown', aoTeclar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = ''
    }
  }, [menuAberto])

  return (
    <div className="flex min-h-dvh">
      {/* Desktop e tablet largo: fixa. */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-borda bg-lateral lg:block">
        <ConteudoLateral dados={dados} />
      </aside>

      {/* Celular e tablet: drawer. */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          />
          <aside className="relative h-full w-[min(18rem,85vw)] animate-deslizar border-r border-borda bg-lateral shadow-2xl">
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              className="absolute top-5 right-3 rounded-lg p-1.5 text-tinta-3 hover:bg-painel-3 hover:text-tinta"
              aria-label="Fechar menu"
            >
              <X className="size-5" aria-hidden />
            </button>
            <ConteudoLateral dados={dados} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-borda bg-fundo/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="-ml-1 rounded-lg p-2 text-tinta-2 hover:bg-painel-3 hover:text-tinta"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <Link href="/">
            <Logo nome={dados.nomeSistema} />
          </Link>
          <Avatar nome={dados.usuario.nome} tamanho="sm" />
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

function ConteudoLateral({ dados }: { dados: DadosCasca }) {
  const caminho = usePathname()
  const router = useRouter()
  const [busca, setBusca] = useState('')

  const ativo = (href: string) => (href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(`${href}/`))

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 pt-6 pb-4">
      <Link href="/" className="px-2">
        <Logo nome={dados.nomeSistema} />
      </Link>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          const q = busca.trim()
          router.push(q ? `/clientes?q=${encodeURIComponent(q)}` : '/clientes')
          setBusca('')
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-3" aria-hidden />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente"
          aria-label="Buscar cliente por nome, CPF, CNPJ ou contato"
          className="h-9 w-full rounded-xl border border-borda bg-painel-2 pr-3 pl-9 text-sm placeholder:text-tinta-4
                     focus:border-azul focus:outline-none"
        />
      </form>

      <nav aria-label="Principal">
        <ul className="space-y-0.5">
          {ITENS.map(({ href, rotulo, icone: Icone }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo(href) ? 'page' : undefined}
                className={cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                  ativo(href)
                    ? 'bg-painel-3 font-medium text-tinta shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]'
                    : 'text-tinta-2 hover:bg-painel-2 hover:text-tinta',
                )}
              >
                <Icone className={cx('size-[18px]', ativo(href) ? 'text-tinta' : 'text-tinta-3')} aria-hidden />
                {rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-2">
        <Link
          href="/carteira"
          className="group flex items-center justify-between rounded-2xl border border-borda bg-painel-2 px-3.5 py-3 transition-colors hover:border-borda-forte"
        >
          <span>
            <span className="block text-[10px] font-semibold tracking-wider text-tinta-4 uppercase">Carteira</span>
            <span className="numeros block text-lg font-semibold tracking-tight">{formatarMoeda(dados.carteira)}</span>
          </span>
          <ChevronRight className="size-4 text-tinta-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        {dados.atrasos > 0 && (
          <Link
            href="/emprestimos?situacao=EM_ATRASO"
            className="group flex items-center justify-between rounded-2xl border border-vermelho/20 bg-vermelho-fundo px-3.5 py-3 transition-colors hover:border-vermelho/40"
          >
            <span>
              <span className="block text-[10px] font-semibold tracking-wider text-vermelho/80 uppercase">Parcelas em atraso</span>
              <span className="numeros block text-lg font-semibold tracking-tight text-vermelho">{dados.atrasos}</span>
            </span>
            <AlertCircle className="size-4 text-vermelho" aria-hidden />
          </Link>
        )}
      </div>

      <BotaoEmprestar className="w-full" />

      <div className="mt-auto">
        <MenuUsuario usuario={dados.usuario} />
      </div>
    </div>
  )
}

function MenuUsuario({ usuario }: { usuario: DadosCasca['usuario'] }) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  return (
    <div ref={raiz} className="relative flex items-center gap-2 border-t border-borda pt-4">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-painel-2"
      >
        <Avatar nome={usuario.nome} tamanho="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{usuario.nome}</span>
          <span className="block truncate text-[11px] text-tinta-3">Administrador</span>
        </span>
      </button>
      <Link
        href="/configuracoes"
        className="rounded-lg p-2 text-tinta-3 transition-colors hover:bg-painel-2 hover:text-tinta"
        aria-label="Configurações da conta"
      >
        <Settings className="size-[18px]" aria-hidden />
      </Link>

      {aberto && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 w-full animate-entrar overflow-hidden rounded-2xl border border-borda-forte bg-painel-3 py-1.5 shadow-2xl shadow-black/60"
        >
          <p className="truncate px-4 pt-1.5 pb-2 text-xs text-tinta-3">{usuario.email}</p>
          <Link
            href="/configuracoes#perfil"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-painel-4"
          >
            <UserRound className="size-4 text-tinta-3" aria-hidden /> Perfil
          </Link>
          <Link
            href="/configuracoes"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-painel-4"
          >
            <Settings className="size-4 text-tinta-3" aria-hidden /> Configurações da conta
          </Link>
          <form action={sair}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-vermelho hover:bg-painel-4"
            >
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
