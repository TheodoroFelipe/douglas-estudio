import type { ReactNode } from 'react'

const cores = {
  neutro: 'bg-stone-100 text-stone-700 ring-stone-200',
  azul: 'bg-sky-50 text-sky-800 ring-sky-200',
  verde: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amarelo: 'bg-amber-50 text-amber-800 ring-amber-200',
  vermelho: 'bg-red-50 text-red-800 ring-red-200',
}

export type CorSelo = keyof typeof cores

export function Selo({ cor = 'neutro', children }: { cor?: CorSelo; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cores[cor]}`}>
      {children}
    </span>
  )
}
