import { forwardRef, useId, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string
  erro?: string
}

export const Campo = forwardRef<HTMLInputElement, Props>(function Campo(
  { rotulo, erro, className = '', id, ...resto },
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
      <input
        ref={ref}
        id={idCampo}
        aria-invalid={!!erro}
        aria-describedby={erro ? idErro : undefined}
        className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 aria-invalid:border-red-600 sm:text-sm"
        {...resto}
      />
      {erro && (
        <p id={idErro} className="mt-1.5 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
})
