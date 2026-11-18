import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { somarMeses } from '../../lib/datas'
import { supabase } from '../../lib/supabase'
import type { Tables, TablesInsert } from '../../lib/tipos-banco'

export type LinhaRecebimento = Tables<'vw_recebimentos'>

/** Recebimento e recibo mexem nas listas de recebimentos, recibos e nos totais dos trabalhos. */
export function invalidarFinanceiro(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all(
    ['recebimentos', 'recibos', 'trabalhos'].map((chave) => queryClient.invalidateQueries({ queryKey: [chave] })),
  )
}

/** Recebimentos de um mês ("2026-11"), mais recentes primeiro. */
export function useRecebimentosDoMes(mes: string) {
  return useQuery({
    queryKey: ['recebimentos', 'mes', mes],
    queryFn: async () => {
      const inicio = `${mes}-01`
      const { data, error } = await supabase
        .from('vw_recebimentos')
        .select('*')
        .gte('data_recebimento', inicio)
        .lt('data_recebimento', somarMeses(inicio, 1))
        .order('data_recebimento', { ascending: false })
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useRecebimentosDoTrabalho(trabalhoId: string) {
  return useQuery({
    queryKey: ['recebimentos', 'trabalho', trabalhoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_recebimentos')
        .select('*')
        .eq('trabalho_id', trabalhoId)
        .order('data_recebimento', { ascending: false })
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useRegistrarRecebimento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (recebimento: TablesInsert<'recebimentos'>) => {
      const { data, error } = await supabase.from('recebimentos').insert(recebimento).select('id, valor').single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidarFinanceiro(queryClient),
  })
}

/** Estorno é definitivo e cancela o recibo emitido (no banco). */
export function useEstornarRecebimento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recebimentos').update({ status: 'estornado' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidarFinanceiro(queryClient),
  })
}
