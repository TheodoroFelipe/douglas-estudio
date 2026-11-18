export type TipoPessoa = 'PF' | 'PJ'

export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, '')
}

function todosIguais(digitos: string): boolean {
  return /^(\d)\1*$/.test(digitos)
}

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = base.split('').reduce((total, d, i) => total + Number(d) * pesos[i], 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cpfValido(texto: string): boolean {
  const cpf = soDigitos(texto)
  if (cpf.length !== 11 || todosIguais(cpf)) return false
  const d1 = digitoVerificador(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = digitoVerificador(cpf.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return cpf.endsWith(`${d1}${d2}`)
}

export function cnpjValido(texto: string): boolean {
  const cnpj = soDigitos(texto)
  if (cnpj.length !== 14 || todosIguais(cnpj)) return false
  const d1 = digitoVerificador(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = digitoVerificador(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return cnpj.endsWith(`${d1}${d2}`)
}

export function documentoValido(tipo: TipoPessoa, texto: string): boolean {
  return tipo === 'PF' ? cpfValido(texto) : cnpjValido(texto)
}

/** Aplica a máscara conforme o tamanho: 000.000.000-00 ou 00.000.000/0000-00. */
export function formatarDocumento(texto: string | null | undefined): string {
  const d = soDigitos(texto ?? '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return texto ?? ''
}
