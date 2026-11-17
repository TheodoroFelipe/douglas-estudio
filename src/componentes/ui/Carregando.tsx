export function Carregando({ telaCheia = false }: { telaCheia?: boolean }) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-3 text-sm text-stone-500 ${telaCheia ? 'min-h-dvh' : 'py-12'}`}
    >
      <span
        aria-hidden
        className="size-5 animate-spin rounded-full border-2 border-stone-300 border-r-stone-900"
      />
      Carregando…
    </div>
  )
}
