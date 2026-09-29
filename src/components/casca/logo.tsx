import { cx } from '@/components/ui'

/** Marca: um losango azul com um "+" e o nome. */
export function Marca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx('size-7', className)} aria-hidden>
      <defs>
        <linearGradient id="marca-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6aa8ff" />
          <stop offset="1" stopColor="#1f5fe0" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="26" height="26" rx="9" fill="url(#marca-g)" />
      <path d="M16 10v12M10 16h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ nome = 'CredMais' }: { nome?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Marca />
      <span className="text-[17px] font-semibold tracking-tight text-tinta">{nome}</span>
    </span>
  )
}
