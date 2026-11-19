// As três planilhas do mês para o contador. Funções puras: recebem os dados
// já lidos do banco (dinheiro em centavos) e devolvem o texto do CSV.
// Cancelados e estornados entram, com o status, para o contador ver o histórico.
import { gerarCsv, valorCsv } from '../../lib/csv'
import { formatarData } from '../../lib/datas'
import { formatarDocumento } from '../../lib/documentos'
import { CLASSIFICACOES, ehClassificacao } from '../despesas/rotulos'
import { infoStatusNota } from '../notas/esquemas'
import { rotuloForma } from '../recebimentos/rotulos'
import { numeroRecibo } from '../recibos/conteudo'
import { rotuloParcela } from '../trabalhos/plano'

const STATUS_RECEBIMENTO: Record<string, string> = { confirmado: 'Confirmado', estornado: 'Estornado' }
const STATUS_DESPESA: Record<string, string> = { ativa: 'Ativa', cancelada: 'Cancelada' }

export type RecebimentoCsv = {
  data: string
  cliente: string
  documento: string | null
  trabalho: string
  parcelaNumero: number | null
  totalParcelas: number
  forma: string
  valor: number
  taxa: number
  recibo: { ano: number; numero: number } | null
  status: string
}

export function csvRecebimentos(linhas: RecebimentoCsv[]): string {
  return gerarCsv(
    ['Data', 'Cliente', 'CPF/CNPJ', 'Trabalho', 'Referência', 'Forma de pagamento', 'Valor', 'Taxa', 'Líquido', 'Recibo', 'Status'],
    linhas.map((r) => [
      formatarData(r.data),
      r.cliente,
      r.documento ? formatarDocumento(r.documento) : null,
      r.trabalho,
      r.parcelaNumero === null ? 'Sem parcela' : rotuloParcela(r.parcelaNumero, r.totalParcelas),
      rotuloForma(r.forma),
      valorCsv(r.valor),
      valorCsv(r.taxa),
      valorCsv(r.valor - r.taxa),
      r.recibo ? { textoFixo: numeroRecibo(r.recibo.ano, r.recibo.numero) } : null,
      STATUS_RECEBIMENTO[r.status] ?? r.status,
    ]),
  )
}

export type NotaCsv = {
  numero: string
  chave: string
  emissao: string
  competencia: string
  cliente: string
  documento: string | null
  trabalho: string
  valor: number
  codigoServico: string
  status: string
  motivoCancelamento: string | null
}

export function csvNotas(linhas: NotaCsv[]): string {
  return gerarCsv(
    ['Número', 'Chave de acesso', 'Emissão', 'Competência', 'Cliente', 'CPF/CNPJ', 'Trabalho', 'Valor do serviço', 'Código do serviço', 'Status', 'Motivo do cancelamento'],
    linhas.map((n) => [
      n.numero,
      { textoFixo: n.chave },
      formatarData(n.emissao),
      formatarData(n.competencia),
      n.cliente,
      n.documento ? formatarDocumento(n.documento) : null,
      n.trabalho,
      valorCsv(n.valor),
      { textoFixo: n.codigoServico },
      infoStatusNota(n.status).rotulo,
      n.motivoCancelamento,
    ]),
  )
}

export type DespesaCsv = {
  data: string
  tipo: string
  classificacao: string
  trabalho: string | null
  cliente: string | null
  fornecedor: string | null
  descricao: string | null
  valor: number
  temComprovante: boolean
  status: string
  motivoCancelamento: string | null
}

export function csvDespesas(linhas: DespesaCsv[]): string {
  return gerarCsv(
    ['Data', 'Tipo', 'Classificação', 'Trabalho', 'Cliente', 'Fornecedor', 'Descrição', 'Valor', 'Comprovante', 'Status', 'Motivo do cancelamento'],
    linhas.map((d) => [
      formatarData(d.data),
      d.tipo,
      ehClassificacao(d.classificacao) ? CLASSIFICACOES[d.classificacao].rotulo : d.classificacao,
      d.trabalho ?? 'Estúdio',
      d.cliente,
      d.fornecedor,
      d.descricao,
      valorCsv(d.valor),
      d.temComprovante ? 'Sim' : 'Não',
      STATUS_DESPESA[d.status] ?? d.status,
      d.motivoCancelamento,
    ]),
  )
}

export type Planilha = 'recebimentos' | 'notas' | 'despesas'

/** "recebimentos-2026-11.csv" */
export function nomeArquivoPlanilha(planilha: Planilha, mes: string): string {
  return `${planilha === 'notas' ? 'notas-fiscais' : planilha}-${mes}.csv`
}
