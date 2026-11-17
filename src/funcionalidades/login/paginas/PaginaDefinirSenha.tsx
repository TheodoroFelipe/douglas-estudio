import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '../../../auth/useAuth'
import { TelaCentral } from '../../../componentes/layout/TelaCentral'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { supabase } from '../../../lib/supabase'
import { esquemaDefinirSenha, mensagemErroAuth, type DadosDefinirSenha } from '../esquemas'

/** Destino dos links de convite e de recuperação de senha. */
export function PaginaDefinirSenha() {
  const { carregando, sessao, senhaDefinida } = useAuth()
  const navegar = useNavigate()
  const [erro, setErro] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosDefinirSenha>({ resolver: zodResolver(esquemaDefinirSenha) })

  if (carregando) return <Carregando telaCheia />
  if (!sessao) {
    return (
      <TelaCentral titulo="Link inválido ou expirado">
        <p className="text-sm text-stone-600">
          Este link não vale mais. Na tela de login, use “Esqueci minha senha” para receber um novo.
        </p>
        <Botao className="mt-6 w-full" onClick={() => navegar('/login')}>
          Ir para o login
        </Botao>
      </TelaCentral>
    )
  }

  async function salvar(dados: DadosDefinirSenha) {
    setErro(null)
    const { error } = await supabase.auth.updateUser({ password: dados.senha })
    if (error) {
      setErro(mensagemErroAuth(error))
      return
    }
    senhaDefinida()
    navegar('/', { replace: true })
  }

  if (!sessao.user.email) return <Navigate to="/login" replace />

  return (
    <TelaCentral titulo="Criar senha">
      <form onSubmit={handleSubmit(salvar)} noValidate className="space-y-4">
        <p className="text-sm text-stone-600">
          Conta: <strong className="text-stone-900">{sessao.user.email}</strong>
        </p>
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          autoFocus
          erro={errors.senha?.message}
          {...register('senha')}
        />
        <Campo
          rotulo="Repita a senha"
          type="password"
          autoComplete="new-password"
          erro={errors.confirmacao?.message}
          {...register('confirmacao')}
        />
        <Botao type="submit" className="w-full" carregando={isSubmitting}>
          Salvar senha
        </Botao>
      </form>
    </TelaCentral>
  )
}
