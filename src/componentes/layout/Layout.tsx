import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../../auth/useAuth'

type ItemMenu = { rotulo: string; caminho: string; soAdmin?: boolean }

// Cada fase acrescenta os seus itens aqui.
const itensMenu: ItemMenu[] = [
  { rotulo: 'Painel', caminho: '/' },
  { rotulo: 'Trabalhos', caminho: '/trabalhos' },
  { rotulo: 'Recebimentos', caminho: '/recebimentos' },
  { rotulo: 'Recibos', caminho: '/recibos' },
  { rotulo: 'Notas fiscais', caminho: '/notas' },
  { rotulo: 'Clientes', caminho: '/clientes' },
  { rotulo: 'Configurações', caminho: '/configuracoes', soAdmin: true },
]

export function Layout() {
  const { perfil, ehAdmin, sair } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const itens = itensMenu.filter((item) => !item.soAdmin || ehAdmin)

  const menu = (
    <nav aria-label="Menu principal" className="flex flex-col gap-1">
      {itens.map((item) => (
        <NavLink
          key={item.caminho}
          to={item.caminho}
          end={item.caminho === '/'}
          onClick={() => setMenuAberto(false)}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-200'
            }`
          }
        >
          {item.rotulo}
        </NavLink>
      ))}
    </nav>
  )

  const usuario = (
    <div className="border-t border-stone-200 pt-4">
      <p className="truncate text-sm font-medium text-stone-900">{perfil?.nome}</p>
      <p className="text-xs text-stone-500">{perfil?.papel === 'admin' ? 'Administrador' : 'Dono'}</p>
      <button
        type="button"
        onClick={sair}
        className="mt-3 text-sm text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline"
      >
        Sair
      </button>
    </div>
  )

  return (
    <div className="min-h-dvh lg:flex">
      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
        <Marca />
        <button
          type="button"
          aria-expanded={menuAberto}
          aria-controls="menu-celular"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700"
        >
          {menuAberto ? 'Fechar' : 'Menu'}
        </button>
      </header>
      {menuAberto && (
        <div id="menu-celular" className="space-y-4 border-b border-stone-200 bg-white px-4 py-4 lg:hidden">
          {menu}
          {usuario}
        </div>
      )}

      {/* Menu lateral (computador) */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-stone-200 bg-white px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="space-y-8">
          <Marca />
          {menu}
        </div>
        {usuario}
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8" />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-stone-900">Douglas Fotos</p>
        <p className="text-xs text-stone-500">Controle financeiro</p>
      </div>
    </div>
  )
}
