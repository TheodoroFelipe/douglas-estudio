import { Link } from 'react-router'

export function PaginaNaoEncontrada() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-stone-900">Página não encontrada</h1>
      <p className="mt-2 text-stone-600">O endereço não existe ou ainda não foi criado.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-stone-900 underline underline-offset-4">
        Voltar ao painel
      </Link>
    </div>
  )
}
