import { createBrowserRouter } from 'react-router'
import { RotaAdmin, RotaProtegida } from './auth/RotaProtegida'
import { Layout } from './componentes/layout/Layout'
import { PaginaDefinirSenha } from './funcionalidades/login/paginas/PaginaDefinirSenha'
import { PaginaCliente } from './funcionalidades/clientes/paginas/PaginaCliente'
import { PaginaConfiguracoes } from './funcionalidades/configuracoes/paginas/PaginaConfiguracoes'
import { PaginaClientes } from './funcionalidades/clientes/paginas/PaginaClientes'
import { PaginaLogin } from './funcionalidades/login/paginas/PaginaLogin'
import { PaginaNotas } from './funcionalidades/notas/paginas/PaginaNotas'
import { PaginaNovaNota } from './funcionalidades/notas/paginas/PaginaNovaNota'
import { PaginaPainel } from './funcionalidades/painel/paginas/PaginaPainel'
import { PaginaNovoRecebimento } from './funcionalidades/recebimentos/paginas/PaginaNovoRecebimento'
import { PaginaRecebimentos } from './funcionalidades/recebimentos/paginas/PaginaRecebimentos'
import { PaginaRecibos } from './funcionalidades/recibos/paginas/PaginaRecibos'
import { PaginaEditarTrabalho, PaginaNovoTrabalho } from './funcionalidades/trabalhos/paginas/PaginaFormTrabalho'
import { PaginaTiposTrabalho } from './funcionalidades/tipos-trabalho/paginas/PaginaTiposTrabalho'
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
          { path: 'trabalhos/tipos', element: <PaginaTiposTrabalho /> },
          { path: 'trabalhos/:id', element: <PaginaTrabalho /> },
          { path: 'trabalhos/:id/editar', element: <PaginaEditarTrabalho /> },
          { path: 'recebimentos', element: <PaginaRecebimentos /> },
          { path: 'recebimentos/novo', element: <PaginaNovoRecebimento /> },
          { path: 'recibos', element: <PaginaRecibos /> },
          { path: 'notas', element: <PaginaNotas /> },
          { path: 'notas/nova', element: <PaginaNovaNota /> },
          { element: <RotaAdmin />, children: [{ path: 'configuracoes', element: <PaginaConfiguracoes /> }] },
          { path: '*', element: <PaginaNaoEncontrada /> },
        ],
      },
    ],
  },
], { basename: import.meta.env.BASE_URL })
