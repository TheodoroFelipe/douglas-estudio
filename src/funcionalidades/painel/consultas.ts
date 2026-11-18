import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { centavosDoBanco } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { limitesDoPeriodo } from './periodo'

export type LinhaMes = {
  mes: string
  recebido: number
  taxas: number
  faturado: number
  despesasDiretas: number
  despesasIndiretas: number
  resultado: number
  previsto: number
  aReceber: number
}

/** Uma linha por mês (em centavos), calculada no banco (painel_periodo). */
export function usePainelPeriodo(inicio: string, fim: string) {
  return useQuery({
    queryKey: ['painel', inicio, fim],
    // Ao trocar o período, o painel anterior fica na tela até o novo chegar.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<LinhaMes[]> => {
      const limites = limitesDoPeriodo(inicio, fim)
      const { data, error } = await supabase.rpc('painel_periodo', { p_inicio: limites.inicio, p_fim: limites.fim })
      if (error) throw error
      return data.map((l) => ({
        mes: l.mes.slice(0, 7),
        recebido: centavosDoBanco(l.recebido),
        taxas: centavosDoBanco(l.taxas),
        faturado: centavosDoBanco(l.faturado),
        despesasDiretas: centavosDoBanco(l.despesas_diretas),
        despesasIndiretas: centavosDoBanco(l.despesas_indiretas),
        resultado: centavosDoBanco(l.resultado),
        previsto: centavosDoBanco(l.previsto),
        aReceber: centavosDoBanco(l.a_receber),
      }))
    },
  })
}

export function somarMeses(linhas: LinhaMes[]): Omit<LinhaMes, 'mes'> {
  const total = { recebido: 0, taxas: 0, faturado: 0, despesasDiretas: 0, despesasIndiretas: 0, resultado: 0, previsto: 0, aReceber: 0 }
  for (const l of linhas) {
    for (const chave of Object.keys(total) as (keyof typeof total)[]) total[chave] += l[chave]
  }
  return total
}

export function useTotalVencido() {
  return useQuery({
    queryKey: ['painel', 'vencido'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('total_vencido')
      if (error) throw error
      return centavosDoBanco(data)
    },
  })
}

export function useAlertas() {
  return useQuery({
    queryKey: ['painel', 'alertas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_alertas').select('*')
      if (error) throw error
      return data
    },
  })
}

/** Parcelas em aberto que vencem no período (trabalhos não cancelados). */
export function useParcelasEmAberto(inicio: string, fim: string) {
  return useQuery({
    queryKey: ['painel', 'parcelas', inicio, fim],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const limites = limitesDoPeriodo(inicio, fim)
      const [parcelas, trabalhos] = await Promise.all([
        supabase
          .from('vw_parcelas_status')
          .select('*')
          .gte('vencimento', limites.inicio)
          .lte('vencimento', limites.fim)
          .gt('saldo', 0)
          .order('vencimento'),
        supabase.from('vw_conciliacao_trabalho').select('trabalho_id, descricao, cliente_nome, status'),
      ])
      if (parcelas.error) throw parcelas.error
      if (trabalhos.error) throw trabalhos.error
      const porId = new Map(trabalhos.data.map((t) => [t.trabalho_id, t]))
      return parcelas.data.flatMap((p) => {
        const t = porId.get(p.trabalho_id)
        return t && t.status !== 'cancelado' ? [{ ...p, trabalho: t }] : []
      })
    },
  })
}
