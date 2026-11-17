import type { ReactNode } from 'react'

const estilos = {
  erro: 'border-red-200 bg-red-50 text-red-800',
  sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-stone-200 bg-stone-100 text-stone-700',
}

export function Alerta({ tipo = 'info', children }: { tipo?: keyof typeof estilos; children: ReactNode }) {
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2.5 text-sm ${estilos[tipo]}`}>
      {children}
    </div>
  )
}
