import { somarMeses } from '../../lib/datas'

/** Parcela do plano no front; numero 0 = sinal. */
export type ParcelaPlano = {
  id?: string
  numero: number
  valorCentavos: number
  vencimento: string
}

export type DadosGerador = {
  totalCentavos: number
  /** 0 = sem sinal. */
  sinalCentavos: number
  vencimentoSinal: string
  quantidadeParcelas: number
  primeiroVencimento: string
}

/**
 * Sinal + N parcelas mensais. O restante é dividido igualmente e os centavos
 * que sobram da divisão vão para a última parcela (1.000 em 3 = 333,33 + 333,33 + 333,34).
 * Lança Error com mensagem para o usuário se os dados não fecham.
 */
export function gerarPlano(dados: DadosGerador): ParcelaPlano[] {
  const { totalCentavos, sinalCentavos, quantidadeParcelas: n } = dados

  if (!Number.isInteger(n) || n < 0) throw new Error('Informe uma quantidade de parcelas válida.')
  if (totalCentavos <= 0) throw new Error('Informe o valor total do trabalho.')
  if (sinalCentavos < 0) throw new Error('O sinal não pode ser negativo.')
  if (sinalCentavos > totalCentavos) throw new Error('O sinal não pode ser maior que o valor total.')

  const restante = totalCentavos - sinalCentavos
  if (restante > 0 && n === 0) throw new Error('Sobra valor depois do sinal: informe quantas parcelas.')
  if (restante === 0 && n > 0) throw new Error('O sinal já cobre o valor total: não sobra nada para as parcelas.')
  if (n > 0 && restante < n) throw new Error('Parcelas demais para esse valor.')
  if (sinalCentavos > 0 && !dados.vencimentoSinal) throw new Error('Informe a data do sinal.')
  if (n > 0 && !dados.primeiroVencimento) throw new Error('Informe o vencimento da primeira parcela.')

  const plano: ParcelaPlano[] = []
  if (sinalCentavos > 0) {
    plano.push({ numero: 0, valorCentavos: sinalCentavos, vencimento: dados.vencimentoSinal })
  }

  const base = Math.floor(restante / Math.max(n, 1))
  for (let i = 0; i < n; i++) {
    const ultima = i === n - 1
    plano.push({
      numero: i + 1,
      valorCentavos: ultima ? restante - base * (n - 1) : base,
      vencimento: somarMeses(dados.primeiroVencimento, i),
    })
  }
  return plano
}

/**
 * Renumera mantendo o sinal (se a primeira linha for o sinal, segue 0) e as demais 1..N na ordem.
 */
export function renumerar(plano: ParcelaPlano[]): ParcelaPlano[] {
  const temSinal = plano[0]?.numero === 0
  return plano.map((p, i) => ({ ...p, numero: temSinal ? i : i + 1 }))
}

/** Ao gerar um plano novo para um trabalho que já existe, aproveita os ids pela posição. */
export function reaproveitarIds(novo: ParcelaPlano[], atual: ParcelaPlano[]): ParcelaPlano[] {
  const ids = atual.map((p) => p.id).filter((id): id is string => !!id)
  return novo.map((p, i) => ({ ...p, id: ids[i] }))
}

export function somaPlano(plano: { valorCentavos: number }[]): number {
  return plano.reduce((total, p) => total + p.valorCentavos, 0)
}

export function rotuloParcela(numero: number, totalParcelas: number): string {
  return numero === 0 ? 'Sinal' : `Parcela ${numero}/${totalParcelas}`
}
