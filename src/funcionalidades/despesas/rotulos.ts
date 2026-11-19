export const CLASSIFICACOES = {
  direta: { rotulo: 'Direta', plural: 'Diretas', explicacao: 'custo de um trabalho' },
  indireta: { rotulo: 'Indireta', plural: 'Indiretas', explicacao: 'custo do estúdio' },
} as const
export type Classificacao = keyof typeof CLASSIFICACOES

export function ehClassificacao(valor: string | null | undefined): valor is Classificacao {
  return valor === 'direta' || valor === 'indireta'
}

/** Tipos de arquivo aceitos no comprovante (os mesmos do bucket) e a extensão de cada um. */
export const EXTENSOES_COMPROVANTE: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
export const ACEITA_COMPROVANTE = Object.keys(EXTENSOES_COMPROVANTE).join(',')
export const TAMANHO_MAXIMO_COMPROVANTE = 10 * 1024 * 1024

/** O banco confere o mesmo caminho (proteger_despesa). */
export function caminhoComprovante(despesaId: string, tipoArquivo: string): string {
  return `${despesaId}/comprovante.${EXTENSOES_COMPROVANTE[tipoArquivo]}`
}

/** Mensagem de erro do arquivo escolhido, ou null se ele serve. */
export function problemaComprovante(arquivo: { type: string; size: number }): string | null {
  if (!EXTENSOES_COMPROVANTE[arquivo.type]) return 'O comprovante deve ser PDF, JPG, PNG ou WEBP.'
  if (arquivo.size > TAMANHO_MAXIMO_COMPROVANTE) return 'O comprovante passa de 10 MB.'
  return null
}

/** "abc/comprovante.jpg" → "comprovante-2026-11-19.jpg" */
export function nomeArquivoComprovante(caminho: string, data: string): string {
  const extensao = caminho.split('.').pop() ?? 'pdf'
  return `comprovante-${data}.${extensao}`
}
