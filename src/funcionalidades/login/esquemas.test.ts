import { describe, expect, it } from 'vitest'
import { esquemaDefinirSenha, esquemaLogin, mensagemErroAuth } from './esquemas'

describe('esquemaLogin', () => {
  it('recusa e-mail inválido', () => {
    const resultado = esquemaLogin.safeParse({ email: 'douglas', senha: 'x' })
    expect(resultado.success).toBe(false)
  })
})

describe('esquemaDefinirSenha', () => {
  it('exige 8 caracteres', () => {
    expect(esquemaDefinirSenha.safeParse({ senha: '1234567', confirmacao: '1234567' }).success).toBe(false)
  })

  it('exige confirmação igual', () => {
    const resultado = esquemaDefinirSenha.safeParse({ senha: '12345678', confirmacao: '12345679' })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0]?.path).toEqual(['confirmacao'])
  })

  it('aceita senha válida', () => {
    expect(esquemaDefinirSenha.safeParse({ senha: '12345678', confirmacao: '12345678' }).success).toBe(true)
  })
})

describe('mensagemErroAuth', () => {
  it('traduz credenciais inválidas', () => {
    expect(mensagemErroAuth({ message: 'Invalid login credentials', code: 'invalid_credentials' })).toBe(
      'E-mail ou senha incorretos.',
    )
  })
})
