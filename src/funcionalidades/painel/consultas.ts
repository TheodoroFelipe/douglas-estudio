import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { centavosDoBanco } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { somarCategorias } from './categorias'
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

/** Quanto falta receber de todos os trabalhos não cancelados, vencido ou não (não depende do período). */
export function useTotalEmAberto() {
  return useQuery({
    queryKey: ['painel', 'em-aberto'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_conciliacao_trabalho').select('saldo_a_receber').neq('status', 'cancelado')
      if (error) throw error
      return data.reduce((soma, t) => soma + Math.max(centavosDoBanco(t.saldo_a_receber), 0), 0)
    },
  })
}

/** Trabalhos concluídos no período (pela data de conclusão), do maior para o menor resultado. */
export function useRankingTrabalhos(inicio: string, fim: string) {
  return useQuery({
    queryKey: ['painel', 'ranking', inicio, fim],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const limites = limitesDoPeriodo(inicio, fim)
      const { data, error } = await supabase
        .from('vw_resultado_trabalho')
        .select('trabalho_id, descricao, cliente_nome, data_conclusao, total_recebido, despesas_diretas, resultado, margem_percentual')
        .eq('status', 'concluido')
        .gte('data_conclusao', limites.inicio)
        .lte('data_conclusao', limites.fim)
        .order('resultado', { ascending: false })
      if (error) throw error
      return data.map((t) => ({
        id: t.trabalho_id!,
        descricao: t.descricao ?? '',
        cliente: t.cliente_nome ?? '',
        dataConclusao: t.data_conclusao ?? '',
        recebido: centavosDoBanco(t.total_recebido),
        despesas: centavosDoBanco(t.despesas_diretas),
        resultado: centavosDoBanco(t.resultado),
        margem: t.margem_percentual === null ? null : Number(t.margem_percentual),
      }))
    },
  })
}

export function useDespesasPorCategoria(inicio: string, fim: string) {
  return useQuery({
    queryKey: ['painel', 'categorias', inicio, fim],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const limites = limitesDoPeriodo(inicio, fim)
      const { data, error } = await supabase
        .from('vw_despesas_por_tipo_mensal')
        .select('tipo_despesa_id, tipo_nome, classificacao, total')
        .gte('mes', limites.inicio)
        .lte('mes', limites.fim)
      if (error) throw error
      return somarCategorias(data)
    },
  })
}
