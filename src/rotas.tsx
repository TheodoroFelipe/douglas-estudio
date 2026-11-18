import { createBrowserRouter } from 'react-router'
import { RotaProtegida } from './auth/RotaProtegida'
import { Layout } from './componentes/layout/Layout'
import { PaginaDefinirSenha } from './funcionalidades/login/paginas/PaginaDefinirSenha'
import { PaginaLogin } from './funcionalidades/login/paginas/PaginaLogin'
import { PaginaPainel } from './funcionalidades/painel/paginas/PaginaPainel'
import { PaginaNaoEncontrada } from './PaginaNaoEncontrada'

export const roteador = createBrowserRouter([
  { path: '/login', element: <PaginaLogin /> },
  { path: '/definir-senha', element: <PaginaDefinirSenha /> },
  {
    element: <RotaProtegida />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <PaginaPainel /> },
          // Rotas só do admin entram dentro de { element: <RotaAdmin />, children: [...] }.
          { path: '*', element: <PaginaNaoEncontrada /> },
        ],
      },
    ],
  },
], { basename: import.meta.env.BASE_URL })
