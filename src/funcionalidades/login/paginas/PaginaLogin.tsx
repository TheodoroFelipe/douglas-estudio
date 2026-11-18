import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../../auth/useAuth'
import { TelaCentral } from '../../../componentes/layout/TelaCentral'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { supabase } from '../../../lib/supabase'
import {
  esquemaLogin,
  esquemaRecuperarSenha,
  mensagemErroAuth,
  type DadosLogin,
  type DadosRecuperarSenha,
} from '../esquemas'

export function PaginaLogin() {
  const { carregando, sessao } = useAuth()
  const local = useLocation()
  const [modo, setModo] = useState<'entrar' | 'recuperar'>('entrar')

  if (carregando) return <Carregando telaCheia />
  if (sessao) {
    const destino = (local.state as { de?: string } | null)?.de ?? '/'
    return <Navigate to={destino} replace />
  }

  return modo === 'entrar' ? (
    <FormularioEntrar aoEsquecerSenha={() => setModo('recuperar')} />
  ) : (
    <FormularioRecuperar aoVoltar={() => setModo('entrar')} />
  )
}

function FormularioEntrar({ aoEsquecerSenha }: { aoEsquecerSenha: () => void }) {
  const [erro, setErro] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosLogin>({ resolver: zodResolver(esquemaLogin) })

  async function entrar(dados: DadosLogin) {
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: dados.email,
      password: dados.senha,
    })
    // Em caso de sucesso, o AuthProvider recebe a sessão e a página redireciona.
    if (error) setErro(mensagemErroAuth(error))
  }

  return (
    <TelaCentral titulo="Entrar">
      <form onSubmit={handleSubmit(entrar)} noValidate className="space-y-4">
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          autoFocus
          erro={errors.email?.message}
          {...register('email')}
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          erro={errors.senha?.message}
          {...register('senha')}
        />
        <Botao type="submit" className="w-full" carregando={isSubmitting}>
          Entrar
        </Botao>
      </form>
      <div className="mt-5 text-center">
        <Botao variante="link" onClick={aoEsquecerSenha}>
          Esqueci minha senha
        </Botao>
      </div>
    </TelaCentral>
  )
}

function FormularioRecuperar({ aoVoltar }: { aoVoltar: () => void }) {
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosRecuperarSenha>({ resolver: zodResolver(esquemaRecuperarSenha) })

  async function enviar(dados: DadosRecuperarSenha) {
    setErro(null)
    const { error } = await supabase.auth.resetPasswordForEmail(dados.email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}definir-senha`,
    })
    if (error) setErro(mensagemErroAuth(error))
    else setEnviado(true)
  }

  return (
    <TelaCentral titulo="Recuperar senha">
      {enviado ? (
        <Alerta tipo="sucesso">
          Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.
        </Alerta>
      ) : (
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
          <p className="text-sm text-stone-600">
            Informe o seu e-mail. Vamos enviar um link para você criar uma nova senha.
          </p>
          {erro && <Alerta tipo="erro">{erro}</Alerta>}
          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            autoFocus
            erro={errors.email?.message}
            {...register('email')}
          />
          <Botao type="submit" className="w-full" carregando={isSubmitting}>
            Enviar link
          </Botao>
        </form>
      )}
      <div className="mt-5 text-center">
        <Botao variante="link" onClick={aoVoltar}>
          Voltar para o login
        </Botao>
      </div>
    </TelaCentral>
  )
}
