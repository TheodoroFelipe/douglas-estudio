import { createBrowserRouter } from 'react-router'
import { RotaProtegida } from './auth/RotaProtegida'
import { Layout } from './componentes/layout/Layout'
import { PaginaDefinirSenha } from './funcionalidades/login/paginas/PaginaDefinirSenha'
import { PaginaCliente } from './funcionalidades/clientes/paginas/PaginaCliente'
import { PaginaClientes } from './funcionalidades/clientes/paginas/PaginaClientes'
import { PaginaLogin } from './funcionalidades/login/paginas/PaginaLogin'
import { PaginaPainel } from './funcionalidades/painel/paginas/PaginaPainel'
import { PaginaEditarTrabalho, PaginaNovoTrabalho } from './funcionalidades/trabalhos/paginas/PaginaFormTrabalho'
import { PaginaTrabalho } from './funcionalidades/trabalhos/paginas/PaginaTrabalho'
import { PaginaTrabalhos } from './funcionalidades/trabalhos/paginas/PaginaTrabalhos'
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
          { path: 'clientes', element: <PaginaClientes /> },
          { path: 'clientes/novo', element: <PaginaCliente /> },
          { path: 'clientes/:id', element: <PaginaCliente /> },
          { path: 'trabalhos', element: <PaginaTrabalhos /> },
          { path: 'trabalhos/novo', element: <PaginaNovoTrabalho /> },
          { path: 'trabalhos/:id', element: <PaginaTrabalho /> },
          { path: 'trabalhos/:id/editar', element: <PaginaEditarTrabalho /> },
          // Rotas só do admin entram dentro de { element: <RotaAdmin />, children: [...] }.
          { path: '*', element: <PaginaNaoEncontrada /> },
        ],
      },
    ],
  },
], { basename: import.meta.env.BASE_URL })
