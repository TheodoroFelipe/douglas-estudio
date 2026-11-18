import { Link } from 'react-router'
import { useAuth } from '../../../auth/useAuth'

/** Provisório: o painel do mês com os alertas entra na Fase 5. */
export function PaginaPainel() {
  const { perfil } = useAuth()

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-stone-900">Olá, {perfil?.nome}</h1>
      <p className="mt-2 text-stone-600">
        Cadastre os <Link to="/clientes" className="font-medium text-stone-900 underline underline-offset-4">clientes</Link> e
        os <Link to="/trabalhos" className="font-medium text-stone-900 underline underline-offset-4">trabalhos</Link> com o plano
        de parcelas. Recebimentos, recibos e notas fiscais entram nas próximas fases.
      </p>
    </div>
  )
}
