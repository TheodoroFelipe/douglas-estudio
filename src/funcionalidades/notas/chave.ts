// Chave de acesso da NFS-e nacional (50 dígitos). O banco confere o mesmo
// (chave_nfse_valida e validar_nota_fiscal); aqui serve para avisar antes.
//
//   município (7) + ambiente gerador (1) + tipo de inscrição (1) + CNPJ/CPF (14)
//   + número da NFS-e (13) + ano/mês de emissão AAMM (4) + código (9) + DV (1)
import { soDigitos } from '../../lib/documentos'

export type ChaveNfse = {
  municipio: string
  /** CNPJ (ou CPF com zeros à esquerda) de quem emitiu. */
  inscricao: string
  numero: string
  /** "2026-11": mês de emissão. */
  mesEmissao: string
}

export function chaveValida(texto: string): boolean {
  const chave = soDigitos(texto)
  if (chave.length !== 50) return false
  let soma = 0
  let peso = 2
  for (let i = 48; i >= 0; i--) {
    soma += Number(chave[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  return Number(chave[49]) === (resto < 2 ? 0 : 11 - resto)
}

export function decodificarChave(texto: string): ChaveNfse | null {
  const chave = soDigitos(texto)
  if (!chaveValida(chave)) return null
  return {
    municipio: chave.slice(0, 7),
    inscricao: chave.slice(9, 23),
    numero: String(Number(chave.slice(23, 36))),
    mesEmissao: `20${chave.slice(36, 38)}-${chave.slice(38, 40)}`,
  }
}

/** Em blocos de 5, para conferir com o PDF sem se perder. */
export function formatarChave(texto: string | null | undefined): string {
  return soDigitos(texto ?? '').replace(/(\d{5})(?=\d)/g, '$1 ')
}
