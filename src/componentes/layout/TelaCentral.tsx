import type { ReactNode } from 'react'

/** Moldura das telas fora do sistema (login, definir senha, sem acesso). */
export function TelaCentral({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/favicon.svg" alt="" className="mx-auto size-11" />
          <p className="mt-3 text-sm font-medium tracking-wide text-stone-500">
            Douglas Guimarães Fotografia
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="mb-5 text-xl font-semibold text-stone-900">{titulo}</h1>
          {children}
        </div>
      </div>
    </main>
  )
}
