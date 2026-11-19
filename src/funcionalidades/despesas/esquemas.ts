import { z } from 'zod'
import { ehDataValida } from '../../lib/datas'
import { centavosDeTexto, centavosParaBanco } from '../../lib/dinheiro'
import type { TablesInsert } from '../../lib/tipos-banco'
import type { Classificacao } from './rotulos'

type Contexto = {
  hoje: string
  /** Classificação do tipo escolhido (undefined se o tipo não existir). */
  classificacaoDe: (tipoId: string) => Classificacao | undefined
}

/** As mesmas regras do banco; aqui só avisam antes de enviar. */
export function criarEsquemaDespesa({ hoje, classificacaoDe }: Contexto) {
  return z
    .object({
      tipo_despesa_id: z.string().min(1, 'Escolha o tipo de despesa.'),
      trabalho_id: z.string(),
      data: z
        .string()
        .refine(ehDataValida, 'Informe a data.')
        .refine((data) => data <= hoje, 'A data não pode ser futura.'),
      valor: z.string(),
      descricao: z.string().max(200, 'Use no máximo 200 caracteres.'),
      fornecedor: z.string().max(100, 'Use no máximo 100 caracteres.'),
    })
    .superRefine((dados, ctx) => {
      const valor = centavosDeTexto(dados.valor)
      if (valor === null || valor <= 0) {
        ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Informe o valor, como 150,00.' })
      }
      if (classificacaoDe(dados.tipo_despesa_id) === 'direta' && !dados.trabalho_id) {
        ctx.addIssue({ code: 'custom', path: ['trabalho_id'], message: 'Despesa direta precisa de um trabalho.' })
      }
    })
}

export type DadosDespesa = z.infer<ReturnType<typeof criarEsquemaDespesa>>

export function despesaParaBanco(dados: DadosDespesa, classificacao: Classificacao): TablesInsert<'despesas'> {
  return {
    tipo_despesa_id: dados.tipo_despesa_id,
    // Indireta não tem trabalho, mesmo que um tenha ficado escolhido antes de trocar o tipo.
    trabalho_id: classificacao === 'direta' ? dados.trabalho_id : null,
    data: dados.data,
    // Texto ("150.00"): o Postgres converte direto para numeric, sem passar por float.
    valor: centavosParaBanco(centavosDeTexto(dados.valor) ?? 0) as unknown as number,
    descricao: dados.descricao.trim() || null,
    fornecedor: dados.fornecedor.trim() || null,
  }
}
