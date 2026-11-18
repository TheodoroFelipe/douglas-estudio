import type { CorSelo } from '../../componentes/ui/Selo'

export const STATUS_TRABALHO = {
  orcamento: { rotulo: 'Orçamento', cor: 'neutro' },
  em_andamento: { rotulo: 'Em andamento', cor: 'azul' },
  concluido: { rotulo: 'Concluído', cor: 'verde' },
  cancelado: { rotulo: 'Cancelado', cor: 'vermelho' },
} as const satisfies Record<string, { rotulo: string; cor: CorSelo }>
export type StatusTrabalho = keyof typeof STATUS_TRABALHO

export const STATUS_PARCELA = {
  paga: { rotulo: 'Paga', cor: 'verde' },
  parcial: { rotulo: 'Parcial', cor: 'amarelo' },
  em_aberto: { rotulo: 'Em aberto', cor: 'neutro' },
  vencida: { rotulo: 'Vencida', cor: 'vermelho' },
} as const satisfies Record<string, { rotulo: string; cor: CorSelo }>

export function infoStatusTrabalho(status: string) {
  return STATUS_TRABALHO[status as StatusTrabalho] ?? { rotulo: status, cor: 'neutro' as const }
}

export function infoStatusParcela(status: string | null) {
  return STATUS_PARCELA[(status ?? 'em_aberto') as keyof typeof STATUS_PARCELA] ?? STATUS_PARCELA.em_aberto
}
