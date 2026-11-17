import { useAuth } from '../../../auth/useAuth'

/** Provisório: o painel do mês com os alertas entra na Fase 5. */
export function PaginaPainel() {
  const { perfil } = useAuth()

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-stone-900">Olá, {perfil?.nome}</h1>
      <p className="mt-2 text-stone-600">
        O acesso está funcionando. As telas de clientes, trabalhos, recebimentos e notas entram nas
        próximas fases.
      </p>
    </div>
  )
}
