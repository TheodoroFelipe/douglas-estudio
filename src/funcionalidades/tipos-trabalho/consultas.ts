import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../lib/tipos-banco'

export type TipoTrabalho = Tables<'tipos_trabalho'>

export const MENSAGENS_ERRO_TIPO = {
  unico: { tipos_trabalho_nome_unico: 'Já existe um tipo com esse nome.' },
  emUso: 'Este tipo tem trabalhos e não pode ser apagado. Desative-o para não aparecer mais em trabalhos novos.',
}

export function useTiposTrabalho() {
  return useQuery({
    queryKey: ['tipos-trabalho'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_trabalho').select('*').order('nome')
      if (error) throw error
      return data
    },
  })
}

/** Nome do tipo pela chave (cai na própria chave enquanto a lista carrega). */
export function useNomeTipo() {
  const { data } = useTiposTrabalho()
  return useCallback((chave: string) => data?.find((t) => t.chave === chave)?.nome ?? chave, [data])
}

/** Quantos trabalhos (de qualquer status) usam cada tipo. */
export function useUsoDosTipos() {
  return useQuery({
    queryKey: ['tipos-trabalho', 'uso'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trabalhos').select('tipo')
      if (error) throw error
      const contagem = new Map<string, number>()
      for (const t of data) contagem.set(t.tipo, (contagem.get(t.tipo) ?? 0) + 1)
      return contagem
    },
  })
}

function useInvalidarTipos() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(['tipos-trabalho', 'trabalhos'].map((chave) => queryClient.invalidateQueries({ queryKey: [chave] })))
}

export function useCriarTipo() {
  const invalidar = useInvalidarTipos()
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.from('tipos_trabalho').insert({ nome: nome.trim() }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: invalidar,
  })
}

export function useAtualizarTipo() {
  const invalidar = useInvalidarTipos()
  return useMutation({
    mutationFn: async ({ chave, ...campos }: { chave: string; nome?: string; ativo?: boolean }) => {
      const { error } = await supabase.from('tipos_trabalho').update(campos).eq('chave', chave)
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}

export function useApagarTipo() {
  const invalidar = useInvalidarTipos()
  return useMutation({
    mutationFn: async (chave: string) => {
      const { error } = await supabase.from('tipos_trabalho').delete().eq('chave', chave)
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}
