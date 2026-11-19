import { useMutation } from '@tanstack/react-query'
import { salvarArquivo } from '../../lib/arquivos'
import { arquivoCsv } from '../../lib/csv'
import { somarMeses } from '../../lib/datas'
import { centavosDoBanco } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import {
  csvDespesas,
  csvNotas,
  csvRecebimentos,
  nomeArquivoPlanilha,
  type DespesaCsv,
  type NotaCsv,
  type Planilha,
  type RecebimentoCsv,
} from './planilhas'

function limitesDoMes(mes: string) {
  const inicio = `${mes}-01`
  return { inicio, fimExclusivo: somarMeses(inicio, 1) }
}

/** Recebimentos pela data do pagamento. */
async function lerRecebimentos(mes: string): Promise<RecebimentoCsv[]> {
  const { inicio, fimExclusivo } = limitesDoMes(mes)
  const { data, error } = await supabase
    .from('vw_recebimentos')
    .select('*')
    .gte('data_recebimento', inicio)
    .lt('data_recebimento', fimExclusivo)
    .order('data_recebimento')
    .order('criado_em')
  if (error) throw error

  const idsClientes = [...new Set(data.map((r) => r.cliente_id).filter((id): id is string => !!id))]
  const documentos = new Map<string, string | null>()
  if (idsClientes.length > 0) {
    const clientes = await supabase.from('clientes').select('id, cpf_cnpj').in('id', idsClientes)
    if (clientes.error) throw clientes.error
    for (const c of clientes.data) documentos.set(c.id, c.cpf_cnpj)
  }

  return data.map((r) => ({
    data: r.data_recebimento ?? '',
    cliente: r.cliente_nome ?? '',
    documento: (r.cliente_id && documentos.get(r.cliente_id)) || null,
    trabalho: r.trabalho_descricao ?? '',
    parcelaNumero: r.parcela_numero,
    totalParcelas: r.total_parcelas ?? 0,
    forma: r.forma_pagamento ?? '',
    valor: centavosDoBanco(r.valor),
    taxa: centavosDoBanco(r.taxa),
    recibo: r.recibo_ano !== null && r.recibo_numero !== null ? { ano: r.recibo_ano, numero: r.recibo_numero } : null,
    status: r.status ?? '',
  }))
}

/** Notas pela competência (o mês que vale para o Simples). */
async function lerNotas(mes: string): Promise<NotaCsv[]> {
  const { inicio, fimExclusivo } = limitesDoMes(mes)
  const { data, error } = await supabase
    .from('notas_fiscais')
    .select('*, trabalho:trabalhos (descricao, cliente:clientes (nome, cpf_cnpj))')
    .gte('data_competencia', inicio)
    .lt('data_competencia', fimExclusivo)
    .order('data_emissao')
    .order('numero')
  if (error) throw error
  return data.map((n) => ({
    numero: n.numero,
    chave: n.chave_acesso,
    emissao: n.data_emissao,
    competencia: n.data_competencia,
    cliente: n.trabalho?.cliente?.nome ?? '',
    documento: n.trabalho?.cliente?.cpf_cnpj ?? null,
    trabalho: n.trabalho?.descricao ?? '',
    valor: centavosDoBanco(n.valor_servico),
    codigoServico: n.codigo_servico,
    status: n.status,
    motivoCancelamento: n.motivo_cancelamento,
  }))
}

/** Despesas pela data do pagamento. */
async function lerDespesas(mes: string): Promise<DespesaCsv[]> {
  const { inicio, fimExclusivo } = limitesDoMes(mes)
  const { data, error } = await supabase
    .from('despesas')
    .select('*, tipo:tipos_despesa (nome, classificacao), trabalho:trabalhos (descricao, cliente:clientes (nome))')
    .gte('data', inicio)
    .lt('data', fimExclusivo)
    .order('data')
    .order('criado_em')
  if (error) throw error
  return data.map((d) => ({
    data: d.data,
    tipo: d.tipo?.nome ?? '',
    classificacao: d.tipo?.classificacao ?? '',
    trabalho: d.trabalho?.descricao ?? null,
    cliente: d.trabalho?.cliente?.nome ?? null,
    fornecedor: d.fornecedor,
    descricao: d.descricao,
    valor: centavosDoBanco(d.valor),
    temComprovante: !!d.comprovante,
    status: d.status,
    motivoCancelamento: d.motivo_cancelamento,
  }))
}

async function montar(planilha: Planilha, mes: string): Promise<{ conteudo: string; linhas: number }> {
  if (planilha === 'recebimentos') {
    const linhas = await lerRecebimentos(mes)
    return { conteudo: csvRecebimentos(linhas), linhas: linhas.length }
  }
  if (planilha === 'notas') {
    const linhas = await lerNotas(mes)
    return { conteudo: csvNotas(linhas), linhas: linhas.length }
  }
  const linhas = await lerDespesas(mes)
  return { conteudo: csvDespesas(linhas), linhas: linhas.length }
}

/** Lê do banco, monta o CSV e baixa. Devolve quantas linhas cada arquivo teve. */
export function useExportar() {
  return useMutation({
    mutationFn: async ({ planilhas, mes }: { planilhas: Planilha[]; mes: string }) => {
      const resultado: Partial<Record<Planilha, number>> = {}
      for (const planilha of planilhas) {
        const { conteudo, linhas } = await montar(planilha, mes)
        salvarArquivo({ blob: arquivoCsv(conteudo), nome: nomeArquivoPlanilha(planilha, mes) })
        resultado[planilha] = linhas
      }
      return resultado
    },
  })
}
