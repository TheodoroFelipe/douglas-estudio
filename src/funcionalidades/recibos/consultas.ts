import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { invalidarFinanceiro } from '../recebimentos/consultas'
import { salvarArquivo } from '../../lib/arquivos'
import { baixarPdfArquivado, emitirRecibo, gerarEArquivarPdf } from './emissao'

function useInvalidarFinanceiro() {
  const queryClient = useQueryClient()
  return () => invalidarFinanceiro(queryClient)
}

export function useRecibos(ano: number) {
  return useQuery({
    queryKey: ['recibos', ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recibos')
        .select(
          '*, recebimento:recebimentos (id, valor, data_recebimento, status, trabalho:trabalhos (id, descricao, cliente:clientes (nome)))',
        )
        .eq('ano', ano)
        .order('numero', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useEmitirRecibo() {
  const invalidar = useInvalidarFinanceiro()
  return useMutation({
    mutationFn: emitirRecibo,
    onSuccess: salvarArquivo,
    onSettled: invalidar,
  })
}

export function useGerarPdfRecibo() {
  const invalidar = useInvalidarFinanceiro()
  return useMutation({
    mutationFn: gerarEArquivarPdf,
    onSuccess: salvarArquivo,
    onSettled: invalidar,
  })
}

export function useBaixarRecibo() {
  return useMutation({
    mutationFn: ({ caminho, ano, numero }: { caminho: string; ano: number; numero: number }) =>
      baixarPdfArquivado(caminho, ano, numero),
    onSuccess: salvarArquivo,
  })
}

export function useCancelarRecibo() {
  const invalidar = useInvalidarFinanceiro()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from('recibos')
        .update({ status: 'cancelado', motivo_cancelamento: motivo.trim() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}
