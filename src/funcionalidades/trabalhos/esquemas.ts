import { z } from 'zod'
import { ehDataValida } from '../../lib/datas'
import { centavosDeTexto, centavosParaCampo, formatarReais } from '../../lib/dinheiro'
import { renumerar, somaPlano, type ParcelaPlano } from './plano'
import { TIPOS_TRABALHO } from './rotulos'

const valorPositivo = (mensagem: string) =>
  z.string().refine((texto) => (centavosDeTexto(texto) ?? 0) > 0, mensagem)

const linhaParcela = z
  .object({
    parcelaId: z.string().optional(),
    sinal: z.boolean(),
    valor: valorPositivo('Valor inválido.'),
    vencimento: z.string().refine(ehDataValida, 'Data inválida.'),
    /** Já recebido nesta parcela (só leitura). */
    pagoCentavos: z.number(),
  })
  .superRefine((linha, ctx) => {
    const valor = centavosDeTexto(linha.valor) ?? 0
    if (linha.pagoCentavos > 0 && valor < linha.pagoCentavos) {
      ctx.addIssue({
        code: 'custom',
        path: ['valor'],
        message: `Já foram recebidos ${formatarReais(linha.pagoCentavos)}.`,
      })
    }
  })

export const esquemaTrabalho = z
  .object({
    cliente_id: z.string().min(1, 'Escolha o cliente.'),
    tipo: z.enum(Object.keys(TIPOS_TRABALHO) as [keyof typeof TIPOS_TRABALHO]),
    descricao: z.string().trim().min(1, 'Descreva o trabalho.'),
    data_evento: z.string().refine((d) => d === '' || ehDataValida(d), 'Data inválida.'),
    hora_evento: z.string().refine((h) => h === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(h), 'Horário inválido.'),
    local_evento: z.string().max(200, 'Use no máximo 200 caracteres.'),
    valor_total: valorPositivo('Informe o valor total.'),
    numero_contrato: z.string(),
    parcelas: z.array(linhaParcela).min(1, 'Gere ou adicione pelo menos uma parcela.'),
  })
  .superRefine((dados, ctx) => {
    if (dados.hora_evento && !dados.data_evento) {
      ctx.addIssue({ code: 'custom', path: ['hora_evento'], message: 'Informe também a data do evento.' })
    }
    const total = centavosDeTexto(dados.valor_total)
    if (!total || dados.parcelas.length === 0) return
    const soma = somaPlano(dados.parcelas.map((p) => ({ valorCentavos: centavosDeTexto(p.valor) ?? 0 })))
    if (soma !== total) {
      ctx.addIssue({
        code: 'custom',
        path: ['parcelas'],
        message: `A soma das parcelas (${formatarReais(soma)}) precisa ser igual ao valor total (${formatarReais(total)}).`,
      })
    }
  })

export type DadosTrabalho = z.infer<typeof esquemaTrabalho>
export type LinhaParcela = DadosTrabalho['parcelas'][number]

/** Linhas do formulário → plano para o banco (numeração 0 = sinal, depois 1..N). */
export function linhasParaPlano(linhas: LinhaParcela[]): ParcelaPlano[] {
  return renumerar(
    linhas.map((l, i) => ({
      id: l.parcelaId,
      numero: i === 0 && l.sinal ? 0 : 1,
      valorCentavos: centavosDeTexto(l.valor) ?? 0,
      vencimento: l.vencimento,
    })),
  )
}

export function planoParaLinhas(plano: (ParcelaPlano & { pagoCentavos?: number })[]): LinhaParcela[] {
  return plano.map((p) => ({
    parcelaId: p.id,
    sinal: p.numero === 0,
    valor: centavosParaCampo(p.valorCentavos),
    vencimento: p.vencimento,
    pagoCentavos: p.pagoCentavos ?? 0,
  }))
}
