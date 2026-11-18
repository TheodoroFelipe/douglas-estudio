// Conteúdo do recibo (texto puro, sem PDF): fácil de testar e de conferir.
import { formatarDocumento } from '../../lib/documentos'
import { formatarData } from '../../lib/datas'
import { formatarReais } from '../../lib/dinheiro'
import { formaNoTexto } from '../recebimentos/rotulos'
import { valorPorExtenso } from './extenso'

export type DadosRecibo = {
  ano: number
  numero: number
  dataEmissao: string
  valorCentavos: number
  dataRecebimento: string
  formaPagamento: string
  /** 0 = sinal; null = recebimento sem parcela. */
  parcelaNumero: number | null
  /** Parcelas do plano sem contar o sinal. */
  totalParcelas: number
  trabalhoDescricao: string
  cliente: { nome: string; cpfCnpj: string; endereco: string }
  estudio: {
    razaoSocial: string
    nomeFantasia: string
    cnpj: string
    endereco: string
    cidade: string
    uf: string
    telefone: string | null
    email: string | null
    responsavel: string
  }
}

function numeroComZeros(numero: number): string {
  return String(numero).padStart(4, '0')
}

/** 2026, 1 → "2026/0001" */
export function numeroRecibo(ano: number, numero: number): string {
  return `${ano}/${numeroComZeros(numero)}`
}

/** Caminho no bucket "recibos"; o banco confere o mesmo formato (caminho_pdf_recibo). */
export function caminhoPdfRecibo(ano: number, numero: number): string {
  return `${ano}/${numeroComZeros(numero)}.pdf`
}

export function nomeArquivoRecibo(ano: number, numero: number): string {
  return `recibo-${ano}-${numeroComZeros(numero)}.pdf`
}

/** "sinal", "parcela 2 de 8" ou null (recebimento sem parcela). */
export function descricaoParcela(parcelaNumero: number | null, totalParcelas: number): string | null {
  if (parcelaNumero === null) return null
  if (parcelaNumero === 0) return 'sinal'
  return `parcela ${parcelaNumero} de ${totalParcelas}`
}

/** "sinal - Formatura Medicina UNILA 2026" */
export function referenciaRecibo(parcelaNumero: number | null, totalParcelas: number, trabalho: string): string {
  const parcela = descricaoParcela(parcelaNumero, totalParcelas)
  return parcela ? `${parcela} - ${trabalho}` : trabalho
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** "2026-11-08" → "8 de novembro de 2026" */
export function dataPorExtenso(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${ano}`
}

export type TextoRecibo = {
  titulo: string
  numero: string
  valor: string
  corpo: string
  localData: string
  assinatura: string[]
  cabecalho: string[]
  rodape: string
}

export function montarTextoRecibo(d: DadosRecibo): TextoRecibo {
  const documento = d.cliente.cpfCnpj.length === 14 ? 'CNPJ' : 'CPF'
  const referencia = referenciaRecibo(d.parcelaNumero, d.totalParcelas, d.trabalhoDescricao)
  const valor = formatarReais(d.valorCentavos)
  const contato = [d.estudio.telefone, d.estudio.email].filter(Boolean).join(' · ')

  return {
    titulo: 'RECIBO',
    numero: `Nº ${numeroRecibo(d.ano, d.numero)}`,
    valor,
    corpo:
      `Recebemos de ${d.cliente.nome}, ${documento} ${formatarDocumento(d.cliente.cpfCnpj)}, ` +
      `com endereço em ${d.cliente.endereco}, a importância de ${valor} (${valorPorExtenso(d.valorCentavos)}), ` +
      `referente a ${referencia}, paga em ${formatarData(d.dataRecebimento)} por ${formaNoTexto(d.formaPagamento)}. ` +
      `Para clareza, firmamos o presente recibo, dando quitação do valor recebido.`,
    localData: `${d.estudio.cidade}/${d.estudio.uf}, ${dataPorExtenso(d.dataEmissao)}.`,
    assinatura: [d.estudio.responsavel, d.estudio.razaoSocial, `CNPJ ${formatarDocumento(d.estudio.cnpj)}`],
    cabecalho: [
      d.estudio.nomeFantasia,
      `${d.estudio.razaoSocial} · CNPJ ${formatarDocumento(d.estudio.cnpj)}`,
      `${d.estudio.endereco} · ${d.estudio.cidade}/${d.estudio.uf}`,
      ...(contato ? [contato] : []),
    ],
    rodape:
      'Recibo de pagamento. A nota fiscal de serviço (NFS-e) com o valor total do trabalho é emitida na conclusão do serviço.',
  }
}
