import { z } from 'zod'
import { centavosDeTexto, centavosParaBanco, centavosParaCampo } from '../../lib/dinheiro'
import { cnpjValido, formatarDocumento, soDigitos } from '../../lib/documentos'
import type { Tables, TablesUpdate } from '../../lib/tipos-banco'

export type Configuracoes = Tables<'configuracoes'>

export const esquemaConfiguracoes = z
  .object({
    nome_fantasia: z.string().trim().min(1, 'Informe o nome do estúdio.'),
    razao_social: z.string(),
    cnpj: z.string(),
    inscricao_municipal: z.string(),
    endereco: z.string(),
    cidade: z.string().trim().min(1, 'Informe a cidade.'),
    uf: z.string().trim().regex(/^[A-Za-z]{2}$/, 'Use a sigla com 2 letras, como PR.'),
    telefone: z.string(),
    email: z.union([z.literal(''), z.email('Informe um e-mail válido.')]),
    responsavel_assinatura: z.string(),
    codigo_servico_padrao: z.string().trim().min(1, 'Informe o código do serviço.'),
    descricao_servico_padrao: z.string().trim().min(1, 'Informe a descrição do serviço.'),
    aliquota_iss_padrao: z.string(),
  })
  .superRefine((dados, ctx) => {
    if (soDigitos(dados.cnpj) && !cnpjValido(dados.cnpj)) {
      ctx.addIssue({ code: 'custom', path: ['cnpj'], message: 'CNPJ inválido.' })
    }
    if (dados.aliquota_iss_padrao.trim()) {
      const centesimos = centavosDeTexto(dados.aliquota_iss_padrao.replace('%', ''))
      if (centesimos === null || centesimos > 10000) {
        ctx.addIssue({ code: 'custom', path: ['aliquota_iss_padrao'], message: 'Informe a alíquota entre 0 e 100, como 2,00.' })
      }
    }
  })

export type DadosConfiguracoes = z.infer<typeof esquemaConfiguracoes>

function ouNulo(texto: string): string | null {
  const limpo = texto.trim()
  return limpo === '' ? null : limpo
}

export function configuracoesParaFormulario(c: Configuracoes): DadosConfiguracoes {
  return {
    nome_fantasia: c.nome_fantasia,
    razao_social: c.razao_social ?? '',
    cnpj: formatarDocumento(c.cnpj),
    inscricao_municipal: c.inscricao_municipal ?? '',
    endereco: c.endereco ?? '',
    cidade: c.cidade,
    uf: c.uf,
    telefone: c.telefone ?? '',
    email: c.email ?? '',
    responsavel_assinatura: c.responsavel_assinatura ?? '',
    codigo_servico_padrao: c.codigo_servico_padrao,
    descricao_servico_padrao: c.descricao_servico_padrao,
    // Alíquota tem 2 casas, como dinheiro: o mesmo formato serve.
    aliquota_iss_padrao: c.aliquota_iss_padrao === null ? '' : centavosParaCampo(Math.round(Number(c.aliquota_iss_padrao) * 100)),
  }
}

export function configuracoesParaBanco(d: DadosConfiguracoes): TablesUpdate<'configuracoes'> {
  const aliquota = d.aliquota_iss_padrao.trim() ? centavosDeTexto(d.aliquota_iss_padrao.replace('%', '')) : null
  return {
    nome_fantasia: d.nome_fantasia.trim(),
    razao_social: ouNulo(d.razao_social),
    cnpj: ouNulo(soDigitos(d.cnpj)),
    inscricao_municipal: ouNulo(d.inscricao_municipal),
    endereco: ouNulo(d.endereco),
    cidade: d.cidade.trim(),
    uf: d.uf.trim().toUpperCase(),
    telefone: ouNulo(d.telefone),
    email: ouNulo(d.email.toLowerCase()),
    responsavel_assinatura: ouNulo(d.responsavel_assinatura),
    codigo_servico_padrao: d.codigo_servico_padrao.trim(),
    descricao_servico_padrao: d.descricao_servico_padrao.trim(),
    // Texto ("2.00"): numeric sem passar por float.
    aliquota_iss_padrao: aliquota === null ? null : (centavosParaBanco(aliquota) as unknown as number),
  }
}

/** O que falta para emitir recibo (o banco confere a mesma lista em emitir_recibo). */
export function pendenciasRecibo(c: Configuracoes): string[] {
  const faltando: string[] = []
  if (!c.razao_social?.trim()) faltando.push('razão social')
  if (!c.cnpj) faltando.push('CNPJ')
  if (!c.endereco?.trim()) faltando.push('endereço')
  if (!c.responsavel_assinatura?.trim()) faltando.push('responsável pela assinatura')
  if (!c.logo_path) faltando.push('logo')
  return faltando
}
