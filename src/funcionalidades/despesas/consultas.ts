import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { salvarArquivo } from '../../lib/arquivos'
import { somarMeses } from '../../lib/datas'
import { supabase } from '../../lib/supabase'
import type { Tables, TablesInsert } from '../../lib/tipos-banco'
import { caminhoComprovante, type Classificacao } from './rotulos'

export type TipoDespesa = Tables<'tipos_despesa'>

export const MENSAGENS_ERRO_TIPO_DESPESA = {
  unico: { tipos_despesa_nome_unico: 'Já existe um tipo de despesa com esse nome.' },
  emUso: 'Este tipo tem despesas e não pode ser apagado. Desative-o para não aparecer mais em despesas novas.',
}

const SELECAO_DESPESA =
  '*, tipo:tipos_despesa (id, nome, classificacao), trabalho:trabalhos (id, descricao, cliente:clientes (nome))'

/** Despesa mexe nas listas de despesas e no resultado dos trabalhos (o painel é atualizado em main.tsx). */
function useInvalidarDespesas() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      ['despesas', 'tipos-despesa', 'trabalhos'].map((chave) => queryClient.invalidateQueries({ queryKey: [chave] })),
    )
}

// -----------------------------------------------------------------------------
// Tipos de despesa
// -----------------------------------------------------------------------------

export function useTiposDespesa() {
  return useQuery({
    queryKey: ['tipos-despesa'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_despesa').select('*').order('nome')
      if (error) throw error
      return data
    },
  })
}

/** Quantas despesas (de qualquer status) usam cada tipo. */
export function useUsoDosTiposDespesa() {
  return useQuery({
    queryKey: ['tipos-despesa', 'uso'],
    queryFn: async () => {
      const { data, error } = await supabase.from('despesas').select('tipo_despesa_id')
      if (error) throw error
      const contagem = new Map<string, number>()
      for (const d of data) contagem.set(d.tipo_despesa_id, (contagem.get(d.tipo_despesa_id) ?? 0) + 1)
      return contagem
    },
  })
}

export function useCriarTipoDespesa() {
  const invalidar = useInvalidarDespesas()
  return useMutation({
    mutationFn: async ({ nome, classificacao }: { nome: string; classificacao: Classificacao }) => {
      const { error } = await supabase.from('tipos_despesa').insert({ nome: nome.trim(), classificacao })
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}

export function useAtualizarTipoDespesa() {
  const invalidar = useInvalidarDespesas()
  return useMutation({
    mutationFn: async ({ id, ...campos }: { id: string; nome?: string; classificacao?: Classificacao; ativo?: boolean }) => {
      const { error } = await supabase.from('tipos_despesa').update(campos).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}

export function useApagarTipoDespesa() {
  const invalidar = useInvalidarDespesas()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tipos_despesa').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}

// -----------------------------------------------------------------------------
// Despesas
// -----------------------------------------------------------------------------

/** Despesas de um mês ("2026-11"), mais recentes primeiro. */
export function useDespesasDoMes(mes: string) {
  return useQuery({
    queryKey: ['despesas', 'mes', mes],
    queryFn: async () => {
      const inicio = `${mes}-01`
      const { data, error } = await supabase
        .from('despesas')
        .select(SELECAO_DESPESA)
        .gte('data', inicio)
        .lt('data', somarMeses(inicio, 1))
        .order('data', { ascending: false })
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type Despesa = NonNullable<ReturnType<typeof useDespesasDoMes>['data']>[number]

export function useDespesasDoTrabalho(trabalhoId: string) {
  return useQuery({
    queryKey: ['despesas', 'trabalho', trabalhoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('despesas')
        .select(SELECAO_DESPESA)
        .eq('trabalho_id', trabalhoId)
        .order('data', { ascending: false })
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useDespesa(id: string | undefined) {
  return useQuery({
    queryKey: ['despesas', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('despesas').select(SELECAO_DESPESA).eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Recebido, despesas diretas (com as taxas de cartão) e resultado do trabalho. */
export function useResultadoTrabalho(trabalhoId: string) {
  return useQuery({
    // Debaixo de "trabalhos": recebimentos e despesas atualizam o resultado.
    queryKey: ['trabalhos', trabalhoId, 'resultado'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_resultado_trabalho').select('*').eq('trabalho_id', trabalhoId).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** A despesa foi salva, mas o comprovante não subiu: dá para anexar de novo na edição. */
export class ErroComprovante extends Error {
  despesaId: string
  constructor(despesaId: string) {
    super('A despesa foi salva, mas o comprovante não foi enviado. Tente anexar de novo.')
    this.despesaId = despesaId
  }
}

async function anexarComprovante(despesaId: string, arquivo: File) {
  const caminho = caminhoComprovante(despesaId, arquivo.type)
  const envio = await supabase.storage.from('comprovantes').upload(caminho, arquivo, { contentType: arquivo.type, upsert: true })
  if (envio.error) throw envio.error
  const { error } = await supabase.from('despesas').update({ comprovante: caminho }).eq('id', despesaId)
  if (error) throw error
}

export function useSalvarDespesa() {
  const invalidar = useInvalidarDespesas()
  return useMutation({
    mutationFn: async ({ id, despesa, comprovante }: { id?: string; despesa: TablesInsert<'despesas'>; comprovante: File | null }) => {
      let despesaId = id
      if (despesaId) {
        const { error } = await supabase.from('despesas').update(despesa).eq('id', despesaId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('despesas').insert(despesa).select('id').single()
        if (error) throw error
        despesaId = data.id
      }
      if (comprovante) {
        try {
          await anexarComprovante(despesaId, comprovante)
        } catch (erro) {
          console.error(erro)
          throw new ErroComprovante(despesaId)
        }
      }
      return { id: despesaId }
    },
    onSettled: invalidar,
  })
}

export function useCancelarDespesa() {
  const invalidar = useInvalidarDespesas()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase.from('despesas').update({ status: 'cancelada', motivo_cancelamento: motivo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}

export function useBaixarComprovante() {
  return useMutation({
    mutationFn: async ({ caminho, nome }: { caminho: string; nome: string }) => {
      const { data, error } = await supabase.storage.from('comprovantes').download(caminho)
      if (error) throw error
      return { blob: data, nome }
    },
    onSuccess: salvarArquivo,
  })
}
