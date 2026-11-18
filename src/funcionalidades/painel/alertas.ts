// Alertas de conciliação (view vw_alertas), agrupados por tipo, com a ação de cada um.
import type { Tables } from '../../lib/tipos-banco'

export type Alerta = Tables<'vw_alertas'>

export const TIPOS_ALERTA = {
  nota_pendente: { titulo: 'Trabalho concluído sem nota fiscal', acao: 'Registrar nota' },
  nota_divergente: { titulo: 'Nota com valor diferente do trabalho', acao: 'Ver trabalho' },
  recibo_pendente: { titulo: 'Recebimento sem recibo', acao: 'Emitir recibo' },
  parcela_vencida: { titulo: 'Parcela vencida', acao: 'Receber' },
  trabalho_prejuizo: { titulo: 'Trabalho no prejuízo', acao: 'Ver trabalho' },
} as const
export type TipoAlerta = keyof typeof TIPOS_ALERTA

/** Ordem do mais importante para o menos (a nota pendente é o alerta principal). */
const ORDEM: TipoAlerta[] = ['nota_pendente', 'nota_divergente', 'parcela_vencida', 'recibo_pendente', 'trabalho_prejuizo']

export function linkDoAlerta(a: Alerta): string {
  switch (a.tipo) {
    case 'nota_pendente':
      return `/notas/nova?trabalho=${a.trabalho_id}`
    case 'parcela_vencida':
      return `/recebimentos/novo?trabalho=${a.trabalho_id}&parcela=${a.referencia_id}`
    default:
      // Recibo pendente: o botão de emitir fica na lista de recebimentos do trabalho.
      return `/trabalhos/${a.trabalho_id}`
  }
}

export type GrupoAlertas = { tipo: TipoAlerta; titulo: string; acao: string; itens: Alerta[] }

export function agruparAlertas(alertas: Alerta[]): GrupoAlertas[] {
  return ORDEM.map((tipo) => ({
    tipo,
    ...TIPOS_ALERTA[tipo],
    itens: alertas
      .filter((a) => a.tipo === tipo)
      .sort((x, y) => (x.data_referencia ?? '').localeCompare(y.data_referencia ?? '')),
  })).filter((g) => g.itens.length > 0)
}
