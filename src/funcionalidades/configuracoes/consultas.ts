import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { TablesUpdate } from '../../lib/tipos-banco'

export function useConfiguracoes() {
  return useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracoes').select('*').single()
      if (error) throw error
      return data
    },
  })
}

export function useSalvarConfiguracoes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dados: TablesUpdate<'configuracoes'>) => {
      const { data, error } = await supabase.from('configuracoes').update(dados).eq('id', true).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (dados) => queryClient.setQueryData(['configuracoes'], dados),
  })
}

/** Logo do bucket privado, como URL local para mostrar na tela. */
export function useLogo(caminho: string | null | undefined) {
  return useQuery({
    queryKey: ['logo', caminho],
    enabled: !!caminho,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('estudio').download(caminho!)
      if (error) throw error
      return URL.createObjectURL(data)
    },
  })
}

export const TIPOS_LOGO = ['image/png', 'image/jpeg']
export const TAMANHO_MAXIMO_LOGO = 2 * 1024 * 1024

/** Envia o logo com nome novo (sem cache antigo), aponta a configuração para ele e apaga o anterior. */
export function useEnviarLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ arquivo, anterior }: { arquivo: File; anterior: string | null }) => {
      const extensao = arquivo.type === 'image/png' ? 'png' : 'jpg'
      const caminho = `logo-${Date.now()}.${extensao}`
      const envio = await supabase.storage.from('estudio').upload(caminho, arquivo, { contentType: arquivo.type })
      if (envio.error) throw envio.error

      const { data, error } = await supabase.from('configuracoes').update({ logo_path: caminho }).eq('id', true).select().single()
      if (error) throw error

      // O antigo não é mais usado; se não der para apagar, só sobra um arquivo.
      if (anterior) await supabase.storage.from('estudio').remove([anterior])
      return data
    },
    onSuccess: (dados) => queryClient.setQueryData(['configuracoes'], dados),
  })
}
