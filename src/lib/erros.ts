type ErroBanco = { code?: string; message?: string; details?: string | null }

type Contexto = {
  /** Mensagem quando o registro está em uso (FK, código 23503). */
  emUso?: string
  /** Mensagem por constraint de unicidade (o nome aparece em message/details). */
  unico?: Record<string, string>
}

const GENERICA = 'Não foi possível salvar. Verifique a conexão e tente de novo.'

/**
 * Traduz um erro do Supabase/Postgres para o usuário.
 * As exceções das nossas regras (raise exception) já vêm em português e passam direto.
 */
export function mensagemErroBanco(erro: unknown, contexto: Contexto = {}): string {
  if (!erro || typeof erro !== 'object') return GENERICA
  const { code, message = '', details = '' } = erro as ErroBanco
  const texto = `${message} ${details ?? ''}`

  if (code === '23505') {
    for (const [constraint, mensagem] of Object.entries(contexto.unico ?? {})) {
      if (texto.includes(constraint)) return mensagem
    }
    return 'Já existe um registro com esses dados.'
  }

  if (code === '23503') {
    return contexto.emUso ?? 'Este registro está ligado a outros e não pode ser removido.'
  }

  if (code === '42501') return 'Você não tem permissão para esta ação.'

  // Mensagens das nossas regras: em português, sem o jargão do Postgres.
  if ((code === '23514' || code === 'P0001' || code === '22023' || code === 'P0002') && !/violates|constraint/i.test(message)) {
    return formatarNumerosNaMensagem(message)
  }

  if (code === '23514') return 'Algum dado está fora do formato aceito. Confira os campos.'

  return GENERICA
}

/** "A soma das parcelas (2900.00) é diferente..." → "A soma das parcelas (R$ 2.900,00)..." */
function formatarNumerosNaMensagem(mensagem: string): string {
  return mensagem.replace(/\b(\d+)\.(\d{2})\b/g, (_, reais: string, centavos: string) => {
    return `R$ ${reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`
  })
}
