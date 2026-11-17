import { z } from 'zod'

const email = z.email('Informe um e-mail válido.')

export const esquemaLogin = z.object({
  email,
  senha: z.string().min(1, 'Informe a senha.'),
})
export type DadosLogin = z.infer<typeof esquemaLogin>

export const esquemaRecuperarSenha = z.object({ email })
export type DadosRecuperarSenha = z.infer<typeof esquemaRecuperarSenha>

export const esquemaDefinirSenha = z
  .object({
    senha: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
    confirmacao: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    message: 'As senhas não conferem.',
    path: ['confirmacao'],
  })
export type DadosDefinirSenha = z.infer<typeof esquemaDefinirSenha>

/** Traduz as mensagens de erro do Supabase Auth mais comuns. */
export function mensagemErroAuth(erro: { message: string; code?: string }): string {
  switch (erro.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.'
    case 'email_not_confirmed':
      return 'Este e-mail ainda não foi confirmado. Use o link do convite.'
    case 'same_password':
      return 'A nova senha precisa ser diferente da atual.'
    case 'weak_password':
      return 'Senha fraca. Use pelo menos 8 caracteres.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
    case 'session_not_found':
    case 'session_expired':
      return 'O link expirou. Peça um novo.'
  }
  return 'Não foi possível concluir. Verifique a conexão e tente de novo.'
}
