import { Navigate, Outlet, useLocation } from 'react-router'
import { Carregando } from '../componentes/ui/Carregando'
import { PaginaSemAcesso } from './PaginaSemAcesso'
import { useAuth } from './useAuth'

/** Exige sessão e perfil cadastrado. */
export function RotaProtegida() {
  const { carregando, sessao, perfil, precisaDefinirSenha } = useAuth()
  const local = useLocation()

  if (carregando) return <Carregando telaCheia />
  if (!sessao) return <Navigate to="/login" replace state={{ de: local.pathname }} />
  if (precisaDefinirSenha) return <Navigate to="/definir-senha" replace />
  if (!perfil) return <PaginaSemAcesso />
  return <Outlet />
}

/** Exige papel admin (usar dentro de RotaProtegida). */
export function RotaAdmin() {
  const { ehAdmin } = useAuth()
  if (!ehAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
