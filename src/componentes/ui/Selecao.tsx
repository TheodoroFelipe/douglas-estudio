import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string
  erro?: string
  children: ReactNode
}

export const Selecao = forwardRef<HTMLSelectElement, Props>(function Selecao(
  { rotulo, erro, className = '', id, children, ...resto },
  ref,
) {
  const idGerado = useId()
  const idCampo = id ?? idGerado
  const idErro = `${idCampo}-erro`

  return (
    <div className={className}>
      <label htmlFor={idCampo} className="mb-1.5 block text-sm font-medium text-stone-700">
        {rotulo}
      </label>
      <select
        ref={ref}
        id={idCampo}
        aria-invalid={!!erro}
        aria-describedby={erro ? idErro : undefined}
        className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 aria-invalid:border-red-600 sm:text-sm"
        {...resto}
      >
        {children}
      </select>
      {erro && (
        <p id={idErro} className="mt-1.5 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
})
