import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'link'
  carregando?: boolean
}

const estilos = {
  primario: 'bg-stone-900 text-white hover:bg-stone-700 disabled:bg-stone-400',
  secundario:
    'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 disabled:text-stone-400',
  link: 'text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline px-0 py-0',
}

export function Botao({
  variante = 'primario',
  carregando = false,
  className = '',
  disabled,
  children,
  type = 'button',
  ...resto
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
      {...resto}
    >
      {carregando && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  )
}
