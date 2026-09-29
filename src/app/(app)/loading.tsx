/** Esqueleto enquanto a página carrega os dados do banco. */
export default function Carregando() {
  return (
    <div className="animate-pulse space-y-6 px-4 pt-8 sm:px-6 lg:px-8" aria-busy aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-painel-3" />
        <div className="h-4 w-72 rounded-lg bg-painel-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-cartao bg-painel" />
        ))}
      </div>
      <div className="h-80 rounded-cartao bg-painel" />
    </div>
  )
}
