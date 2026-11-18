import { z } from 'zod'
import { ehDataValida } from '../../lib/datas'
import { centavosDeTexto, centavosParaBanco, formatarReais } from '../../lib/dinheiro'
import type { TablesInsert } from '../../lib/tipos-banco'
import { FORMAS_COM_TAXA, FORMAS_PAGAMENTO } from './rotulos'

export type LimitesRecebimento = {
  hoje: string
  /** Quanto falta receber do trabalho, em centavos. */
  saldoTrabalho: number
  /** Saldo de cada parcela em aberto, em centavos. */
  saldoParcela: (parcelaId: string) => number | undefined
}

/** Os limites são os mesmos do banco; aqui só avisam antes de enviar. */
export function criarEsquemaRecebimento({ hoje, saldoTrabalho, saldoParcela }: LimitesRecebimento) {
  return z
    .object({
      parcela_id: z.string(),
      data_recebimento: z
        .string()
        .refine(ehDataValida, 'Informe a data.')
        .refine((data) => data <= hoje, 'A data não pode ser futura.'),
      valor: z.string(),
      forma_pagamento: z.string().refine((forma) => forma in FORMAS_PAGAMENTO, 'Escolha a forma de pagamento.'),
      taxa: z.string(),
      observacoes: z.string(),
    })
    .superRefine((dados, ctx) => {
      const valor = centavosDeTexto(dados.valor)
      if (valor === null || valor <= 0) {
        ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Informe o valor recebido.' })
        return
      }
      const saldo = dados.parcela_id ? saldoParcela(dados.parcela_id) : undefined
      if (saldo !== undefined && valor > saldo) {
        ctx.addIssue({ code: 'custom', path: ['valor'], message: `O saldo desta parcela é ${formatarReais(saldo)}.` })
      } else if (valor > saldoTrabalho) {
        ctx.addIssue({
          code: 'custom',
          path: ['valor'],
          message: `Faltam ${formatarReais(saldoTrabalho)} para fechar o valor do trabalho. Se o cliente pagou a mais, aumente antes o valor do trabalho.`,
        })
      }

      if (FORMAS_COM_TAXA.includes(dados.forma_pagamento) && dados.taxa.trim()) {
        const taxa = centavosDeTexto(dados.taxa)
        if (taxa === null) ctx.addIssue({ code: 'custom', path: ['taxa'], message: 'Informe a taxa em reais, como 9,00.' })
        else if (taxa > valor) ctx.addIssue({ code: 'custom', path: ['taxa'], message: 'A taxa não pode passar do valor recebido.' })
      }
    })
}

export type DadosRecebimento = z.infer<ReturnType<typeof criarEsquemaRecebimento>>

export function recebimentoParaBanco(trabalhoId: string, dados: DadosRecebimento): TablesInsert<'recebimentos'> {
  const comTaxa = FORMAS_COM_TAXA.includes(dados.forma_pagamento)
  const taxa = comTaxa ? (centavosDeTexto(dados.taxa) ?? 0) : 0
  const observacoes = dados.observacoes.trim()
  return {
    trabalho_id: trabalhoId,
    parcela_id: dados.parcela_id || null,
    data_recebimento: dados.data_recebimento,
    // Texto ("600.00"): o Postgres converte direto para numeric, sem passar por float.
    valor: centavosParaBanco(centavosDeTexto(dados.valor) ?? 0) as unknown as number,
    forma_pagamento: dados.forma_pagamento,
    taxa: centavosParaBanco(taxa) as unknown as number,
    observacoes: observacoes || null,
  }
}
