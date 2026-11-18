import { z } from 'zod'
import { documentoValido, formatarDocumento, soDigitos } from '../../lib/documentos'
import type { Tables, TablesInsert } from '../../lib/tipos-banco'

export type Cliente = Tables<'clientes'>

export const esquemaCliente = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome.'),
    tipo_pessoa: z.enum(['PF', 'PJ']),
    cpf_cnpj: z.string(),
    telefone: z.string(),
    email: z.union([z.literal(''), z.email('Informe um e-mail válido.')]),
    endereco: z.string(),
    observacoes: z.string(),
  })
  .superRefine((dados, ctx) => {
    const digitos = soDigitos(dados.cpf_cnpj)
    if (digitos && !documentoValido(dados.tipo_pessoa, digitos)) {
      ctx.addIssue({
        code: 'custom',
        path: ['cpf_cnpj'],
        message: dados.tipo_pessoa === 'PF' ? 'CPF inválido.' : 'CNPJ inválido.',
      })
    }
  })

export type DadosCliente = z.infer<typeof esquemaCliente>

export const clienteVazio: DadosCliente = {
  nome: '',
  tipo_pessoa: 'PF',
  cpf_cnpj: '',
  telefone: '',
  email: '',
  endereco: '',
  observacoes: '',
}

function ouNulo(texto: string): string | null {
  const limpo = texto.trim()
  return limpo === '' ? null : limpo
}

export function clienteParaBanco(dados: DadosCliente): TablesInsert<'clientes'> {
  return {
    nome: dados.nome.trim(),
    tipo_pessoa: dados.tipo_pessoa,
    cpf_cnpj: ouNulo(soDigitos(dados.cpf_cnpj)),
    telefone: ouNulo(dados.telefone),
    email: ouNulo(dados.email.toLowerCase()),
    endereco: ouNulo(dados.endereco),
    observacoes: ouNulo(dados.observacoes),
  }
}

export function clienteParaFormulario(cliente: Cliente): DadosCliente {
  return {
    nome: cliente.nome,
    tipo_pessoa: cliente.tipo_pessoa === 'PJ' ? 'PJ' : 'PF',
    cpf_cnpj: formatarDocumento(cliente.cpf_cnpj),
    telefone: cliente.telefone ?? '',
    email: cliente.email ?? '',
    endereco: cliente.endereco ?? '',
    observacoes: cliente.observacoes ?? '',
  }
}

/** Busca sem acento e sem diferenciar maiúsculas; CPF/CNPJ com ou sem máscara. */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export function clienteCombina(cliente: Cliente, busca: string): boolean {
  const termo = normalizarBusca(busca)
  if (!termo) return true
  if (normalizarBusca(cliente.nome).includes(termo)) return true
  const digitos = soDigitos(busca)
  return digitos.length >= 3 && (cliente.cpf_cnpj ?? '').includes(digitos)
}
