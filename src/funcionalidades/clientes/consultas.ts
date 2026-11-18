import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { TablesInsert } from '../../lib/tipos-banco'

// O estúdio tem poucas centenas de clientes: carrega tudo e filtra na tela.
export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').order('nome')
      if (error) throw error
      return data
    },
  })
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ['clientes', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSalvarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: TablesInsert<'clientes'> }) => {
      const consulta = id
        ? supabase.from('clientes').update(dados).eq('id', id)
        : supabase.from('clientes').insert(dados)
      const { data, error } = await consulta.select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      // O nome do cliente aparece nas listas de trabalhos.
      queryClient.invalidateQueries({ queryKey: ['trabalhos'] })
    },
  })
}

export function useApagarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export const MENSAGENS_ERRO_CLIENTE = {
  unico: { clientes_cpf_cnpj_key: 'Já existe um cliente com esse CPF/CNPJ.' },
  emUso: 'Este cliente tem trabalhos cadastrados e não pode ser apagado.',
}
