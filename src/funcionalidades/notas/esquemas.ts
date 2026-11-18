import { z } from 'zod'
import { ehDataValida } from '../../lib/datas'
import { centavosDeTexto, centavosParaBanco } from '../../lib/dinheiro'
import { soDigitos } from '../../lib/documentos'
import type { TablesInsert } from '../../lib/tipos-banco'
import { chaveValida, decodificarChave } from './chave'

/** As mesmas regras do banco (validar_nota_fiscal), para avisar antes de enviar. */
export function criarEsquemaNota({ hoje, cnpjEstudio }: { hoje: string; cnpjEstudio: string | null }) {
  return z
    .object({
      numero: z.string().trim().regex(/^\d+$/, 'Informe o número da nota (só dígitos).'),
      chave_acesso: z.string().refine((c) => chaveValida(c), 'Chave inválida: confira os 50 dígitos.'),
      data_emissao: z
        .string()
        .refine(ehDataValida, 'Informe a data de emissão.')
        .refine((d) => d <= hoje, 'A data de emissão não pode ser futura.'),
      data_competencia: z.string().refine(ehDataValida, 'Informe a competência.'),
      valor_servico: z.string().refine((v) => (centavosDeTexto(v) ?? 0) > 0, 'Informe o valor da nota.'),
      codigo_servico: z.string().trim().min(1, 'Informe o código do serviço.'),
      descricao_servico: z.string().trim().min(1, 'Informe a descrição do serviço.'),
      aliquota_iss: z.string(),
    })
    .superRefine((dados, ctx) => {
      const chave = decodificarChave(dados.chave_acesso)
      if (!chave) return
      if (/^\d+$/.test(dados.numero.trim()) && Number(dados.numero) !== Number(chave.numero)) {
        ctx.addIssue({ code: 'custom', path: ['numero'], message: `A chave de acesso é da nota ${chave.numero}.` })
      }
      if (cnpjEstudio && chave.inscricao !== cnpjEstudio) {
        ctx.addIssue({ code: 'custom', path: ['chave_acesso'], message: 'Esta chave é de uma nota de outro CNPJ, não do estúdio.' })
      }
      if (dados.aliquota_iss.trim()) {
        const centesimos = centavosDeTexto(dados.aliquota_iss.replace('%', ''))
        if (centesimos === null || centesimos > 10000) {
          ctx.addIssue({ code: 'custom', path: ['aliquota_iss'], message: 'Informe a alíquota entre 0 e 100, ou deixe em branco.' })
        }
      }
    })
}

export type DadosNota = z.infer<ReturnType<typeof criarEsquemaNota>>

export function notaParaBanco(
  trabalhoId: string,
  dados: DadosNota,
  notaSubstituidaId: string | null,
): TablesInsert<'notas_fiscais'> {
  const aliquota = dados.aliquota_iss.trim() ? centavosDeTexto(dados.aliquota_iss.replace('%', '')) : null
  return {
    trabalho_id: trabalhoId,
    numero: dados.numero.trim(),
    chave_acesso: soDigitos(dados.chave_acesso),
    data_emissao: dados.data_emissao,
    data_competencia: dados.data_competencia,
    // Texto ("3000.00"): numeric sem passar por float.
    valor_servico: centavosParaBanco(centavosDeTexto(dados.valor_servico) ?? 0) as unknown as number,
    codigo_servico: dados.codigo_servico.trim(),
    descricao_servico: dados.descricao_servico.trim(),
    aliquota_iss: aliquota === null ? null : (centavosParaBanco(aliquota) as unknown as number),
    nota_substituida_id: notaSubstituidaId,
  }
}

export const STATUS_NOTA = {
  emitida: { rotulo: 'Emitida', cor: 'verde' },
  cancelada: { rotulo: 'Cancelada', cor: 'vermelho' },
  substituida: { rotulo: 'Substituída', cor: 'neutro' },
} as const

export function infoStatusNota(status: string) {
  return STATUS_NOTA[status as keyof typeof STATUS_NOTA] ?? { rotulo: status, cor: 'neutro' as const }
}

export function nomeArquivoNota(numero: string, tipo: 'pdf' | 'xml'): string {
  return `nfse-${numero}.${tipo}`
}
