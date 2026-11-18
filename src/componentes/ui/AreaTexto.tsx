import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  rotulo: string
  erro?: string
  dica?: ReactNode
}

export const AreaTexto = forwardRef<HTMLTextAreaElement, Props>(function AreaTexto(
  { rotulo, erro, dica, className = '', id, rows = 3, ...resto },
  ref,
) {
  const idGerado = useId()
  const idCampo = id ?? idGerado
  const idDica = `${idCampo}-dica`
  const idErro = `${idCampo}-erro`
  const descritores = [dica && idDica, erro && idErro].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={idCampo} className="mb-1.5 block text-sm font-medium text-stone-700">
        {rotulo}
      </label>
      <textarea
        ref={ref}
        id={idCampo}
        rows={rows}
        aria-invalid={!!erro}
        aria-describedby={descritores}
        className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 aria-invalid:border-red-600 sm:text-sm"
        {...resto}
      />
      {dica && (
        <p id={idDica} className="mt-1.5 text-xs text-stone-500">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="mt-1.5 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
})
