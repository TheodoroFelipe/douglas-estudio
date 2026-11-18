import type { ReactNode } from 'react'
import { Link } from 'react-router'

type Props = {
  titulo: string
  subtitulo?: ReactNode
  voltar?: { para: string; rotulo: string }
  acoes?: ReactNode
}

export function CabecalhoPagina({ titulo, subtitulo, voltar, acoes }: Props) {
  return (
    <header className="mb-6">
      {voltar && (
        <Link
          to={voltar.para}
          className="mb-2 inline-block text-sm text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline"
        >
          ← {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-stone-900 sm:text-2xl">{titulo}</h1>
          {subtitulo && <div className="mt-1 text-sm text-stone-600">{subtitulo}</div>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </header>
  )
}

/** Link com cara de botão (para navegação). */
export function BotaoLink({
  para,
  children,
  variante = 'primario',
}: {
  para: string
  children: ReactNode
  variante?: 'primario' | 'secundario'
}) {
  const estilo =
    variante === 'primario'
      ? 'bg-stone-900 text-white hover:bg-stone-700'
      : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100'
  return (
    <Link
      to={para}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${estilo}`}
    >
      {children}
    </Link>
  )
}
