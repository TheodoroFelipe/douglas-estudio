import { Botao } from '../componentes/ui/Botao'
import { TelaCentral } from '../componentes/layout/TelaCentral'
import { useAuth } from './useAuth'

export function PaginaSemAcesso() {
  const { sessao, sair } = useAuth()

  return (
    <TelaCentral titulo="Acesso não liberado">
      <p className="text-sm text-stone-600">
        A conta <strong className="text-stone-900">{sessao?.user.email}</strong> entrou, mas ainda não tem
        acesso ao sistema. Peça ao administrador para liberar o seu perfil.
      </p>
      <Botao variante="secundario" className="mt-6 w-full" onClick={sair}>
        Sair
      </Botao>
    </TelaCentral>
  )
}
