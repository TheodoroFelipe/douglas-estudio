import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { salvarArquivo } from '../../lib/arquivos'
import { somarMeses } from '../../lib/datas'
import { supabase } from '../../lib/supabase'
import type { TablesInsert } from '../../lib/tipos-banco'

const SELECAO_NOTA = '*, trabalho:trabalhos (id, descricao, valor_total, status, cliente:clientes (nome))'

function invalidarNotas(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all(['notas', 'trabalhos'].map((chave) => queryClient.invalidateQueries({ queryKey: [chave] })))
}

/** Notas pela competência (mês "2026-11"), mais recentes primeiro. */
export function useNotasDoMes(mes: string) {
  return useQuery({
    queryKey: ['notas', 'mes', mes],
    queryFn: async () => {
      const inicio = `${mes}-01`
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(SELECAO_NOTA)
        .gte('data_competencia', inicio)
        .lt('data_competencia', somarMeses(inicio, 1))
        .order('data_emissao', { ascending: false })
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type Nota = NonNullable<ReturnType<typeof useNotasDoMes>['data']>[number]

export function useNotasDoTrabalho(trabalhoId: string | undefined) {
  return useQuery({
    queryKey: ['notas', 'trabalho', trabalhoId],
    enabled: !!trabalhoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(SELECAO_NOTA)
        .eq('trabalho_id', trabalhoId!)
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Trabalhos concluídos sem nota emitida (o alerta principal). */
export function useNotasPendentes() {
  return useQuery({
    queryKey: ['trabalhos', 'nota-pendente'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_conciliacao_trabalho')
        .select('trabalho_id, descricao, cliente_nome, valor_total, data_conclusao')
        .eq('nota_pendente', true)
        .order('data_conclusao', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

type TipoArquivo = 'pdf' | 'xml'
const TIPOS_CONTEUDO: Record<TipoArquivo, string> = { pdf: 'application/pdf', xml: 'application/xml' }

/** O banco confere o mesmo caminho (validar_nota_fiscal). */
export function caminhoArquivoNota(notaId: string, tipo: TipoArquivo): string {
  return `${notaId}/nota.${tipo}`
}

/** Envia (ou troca) o PDF/XML de uma nota emitida e grava o caminho. */
async function anexar(notaId: string, tipo: TipoArquivo, arquivo: File) {
  const caminho = caminhoArquivoNota(notaId, tipo)
  const envio = await supabase.storage
    .from('notas-fiscais')
    .upload(caminho, arquivo, { contentType: TIPOS_CONTEUDO[tipo], upsert: true })
  if (envio.error) throw envio.error
  const campo = tipo === 'pdf' ? { arquivo_pdf: caminho } : { arquivo_xml: caminho }
  const { error } = await supabase.from('notas_fiscais').update(campo).eq('id', notaId)
  if (error) throw error
}

/** A nota foi registrada, mas um arquivo não subiu: dá para anexar depois. */
export class ErroArquivoNota extends Error {
  notaId: string
  constructor(notaId: string) {
    super('A nota foi registrada, mas o arquivo não foi enviado. Anexe de novo na lista de notas ou no trabalho.')
    this.notaId = notaId
  }
}

export function useRegistrarNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nota, pdf, xml }: { nota: TablesInsert<'notas_fiscais'>; pdf: File; xml: File | null }) => {
      const { data, error } = await supabase.from('notas_fiscais').insert(nota).select('id').single()
      if (error) throw error
      try {
        await anexar(data.id, 'pdf', pdf)
        if (xml) await anexar(data.id, 'xml', xml)
      } catch (erro) {
        console.error(erro)
        throw new ErroArquivoNota(data.id)
      }
      return data
    },
    onSettled: () => invalidarNotas(queryClient),
  })
}

export function useAnexarArquivoNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ notaId, tipo, arquivo }: { notaId: string; tipo: TipoArquivo; arquivo: File }) =>
      anexar(notaId, tipo, arquivo),
    onSettled: () => invalidarNotas(queryClient),
  })
}

export function useBaixarArquivoNota() {
  return useMutation({
    mutationFn: async ({ caminho, nome }: { caminho: string; nome: string }) => {
      const { data, error } = await supabase.storage.from('notas-fiscais').download(caminho)
      if (error) throw error
      return { blob: data, nome }
    },
    onSuccess: salvarArquivo,
  })
}

export function useCancelarNota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from('notas_fiscais')
        .update({ status: 'cancelada', motivo_cancelamento: motivo })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidarNotas(queryClient),
  })
}
