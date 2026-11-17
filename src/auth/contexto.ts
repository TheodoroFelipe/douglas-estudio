import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'
import type { Tables } from '../lib/tipos-banco'

export type Perfil = Tables<'perfis'>

export type EstadoAuth = {
  carregando: boolean
  sessao: Session | null
  /** null quando o usuário entrou mas não tem linha em perfis (sem acesso). */
  perfil: Perfil | null
  ehAdmin: boolean
  /** Veio de um link de convite ou de recuperação: precisa definir a senha. */
  precisaDefinirSenha: boolean
  senhaDefinida: () => void
  sair: () => Promise<void>
}

export const ContextoAuth = createContext<EstadoAuth | null>(null)
