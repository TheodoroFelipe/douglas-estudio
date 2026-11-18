// Dinheiro no front é sempre centavos (inteiro). Nada de somar reais em float.

/**
 * Lê um valor digitado em pt-BR ("1.234,56", "1234,5", "R$ 300", "300.00") e devolve centavos.
 * Devolve null se o texto não for um valor válido.
 */
export function centavosDeTexto(texto: string): number | null {
  let limpo = texto.replace(/R\$/i, '').replace(/\s/g, '')
  if (limpo === '') return null

  if (limpo.includes(',')) {
    // Formato brasileiro: pontos são milhar, vírgula é decimal.
    if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return null
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // "1.234" sem vírgula: ponto como milhar.
    limpo = limpo.replace(/\./g, '')
  } else if (!/^\d+(\.\d{1,2})?$/.test(limpo)) {
    return null
  }

  const [reais, fracao = ''] = limpo.split('.')
  const centavos = Number(reais) * 100 + Number(fracao.padEnd(2, '0'))
  return Number.isSafeInteger(centavos) ? centavos : null
}

/** 123456 → "R$ 1.234,56" */
export function formatarReais(centavos: number): string {
  const sinal = centavos < 0 ? '-' : ''
  const absoluto = Math.abs(centavos)
  const reais = String(Math.trunc(absoluto / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const resto = String(absoluto % 100).padStart(2, '0')
  return `${sinal}R$ ${reais},${resto}`
}

/** 123456 → "1.234,56" (para preencher campos de formulário). */
export function centavosParaCampo(centavos: number): string {
  return formatarReais(centavos).replace('R$ ', '')
}

/** 300000 → "3000.00": formato que as funções do banco recebem. */
export function centavosParaBanco(centavos: number): string {
  const sinal = centavos < 0 ? '-' : ''
  const absoluto = Math.abs(centavos)
  return `${sinal}${Math.trunc(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`
}

/**
 * Valor numeric vindo do banco (o PostgREST manda como número JSON) → centavos.
 * numeric(12,2) cabe com folga na precisão do double, então o arredondamento é exato.
 */
export function centavosDoBanco(valor: number | string | null | undefined): number {
  if (valor === null || valor === undefined) return 0
  return Math.round(Number(valor) * 100)
}
