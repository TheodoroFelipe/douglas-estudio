import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { centavosParaBanco } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import type { ParcelaPlano } from './plano'
import type { StatusTrabalho } from './rotulos'

/** Lista com os totais (contratado, recebido, saldo) já calculados pela view. */
export function useTrabalhos() {
  return useQuery({
    queryKey: ['trabalhos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_conciliacao_trabalho')
        .select('*')
        .order('data_evento', { ascending: false, nullsFirst: true })
      if (error) throw error
      return data
    },
  })
}

export function useTrabalho(id: string | undefined) {
  return useQuery({
    queryKey: ['trabalhos', id],
    enabled: !!id,
    queryFn: async () => {
      const [trabalho, resumo, parcelas] = await Promise.all([
        supabase.from('trabalhos').select('*, cliente:clientes (id, nome, cpf_cnpj)').eq('id', id!).maybeSingle(),
        supabase.from('vw_conciliacao_trabalho').select('*').eq('trabalho_id', id!).maybeSingle(),
        supabase.from('vw_parcelas_status').select('*').eq('trabalho_id', id!).order('numero'),
      ])
      if (trabalho.error) throw trabalho.error
      if (resumo.error) throw resumo.error
      if (parcelas.error) throw parcelas.error
      if (!trabalho.data) return null
      return { trabalho: trabalho.data, resumo: resumo.data, parcelas: parcelas.data }
    },
  })
}

export type DadosSalvarTrabalho = {
  id?: string
  cliente_id: string
  tipo: string
  descricao: string
  data_evento: string
  valor_total_centavos: number
  numero_contrato: string
  parcelas: ParcelaPlano[]
}

export function useSalvarTrabalho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dados: DadosSalvarTrabalho) => {
      // Dinheiro vai como texto ("3000.00") para não passar por float.
      const { data, error } = await supabase.rpc('salvar_trabalho', {
        p_trabalho: {
          id: dados.id ?? '',
          cliente_id: dados.cliente_id,
          tipo: dados.tipo,
          descricao: dados.descricao.trim(),
          data_evento: dados.data_evento,
          valor_total: centavosParaBanco(dados.valor_total_centavos),
          numero_contrato: dados.numero_contrato.trim(),
        },
        // Parcela nova vai sem id (o banco converte id para uuid; texto vazio quebraria).
        p_parcelas: dados.parcelas.map((p) => ({
          ...(p.id ? { id: p.id } : {}),
          numero: p.numero,
          valor: centavosParaBanco(p.valorCentavos),
          vencimento: p.vencimento,
        })),
      })
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trabalhos'] }),
  })
}

export function useAlterarStatusTrabalho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusTrabalho }) => {
      const { error } = await supabase.from('trabalhos').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trabalhos'] }),
  })
}
