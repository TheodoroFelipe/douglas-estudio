// Fluxo do recibo: o banco reserva o número (emitir_recibo); o navegador gera o PDF,
// guarda no Storage (uma vez só) e grava o caminho no recibo.
import { centavosDoBanco } from '../../lib/dinheiro'
import { mensagemErroBanco } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { caminhoPdfRecibo, nomeArquivoRecibo, numeroRecibo, type DadosRecibo } from './conteudo'
import { gerarPdfRecibo, type Logo } from './pdf'

export type ArquivoRecibo = { blob: Blob; nome: string; numero: string }

/** O recibo foi emitido, mas o PDF não ficou guardado: dá para gerar de novo. */
export class ErroPdfRecibo extends Error {
  constructor(numero: string) {
    super(`O recibo ${numero} foi emitido, mas o PDF não foi salvo. Use "Gerar PDF" para tentar de novo.`)
  }
}

async function carregarLogo(caminho: string): Promise<Logo> {
  const { data, error } = await supabase.storage.from('estudio').download(caminho)
  if (error) throw error
  return { dados: new Uint8Array(await data.arrayBuffer()), formato: data.type === 'image/jpeg' ? 'JPEG' : 'PNG' }
}

async function carregarDados(reciboId: string) {
  const { data: recibo, error } = await supabase.from('recibos').select('*').eq('id', reciboId).single()
  if (error) throw error

  const { data: rec, error: erroRec } = await supabase
    .from('vw_recebimentos')
    .select('*')
    .eq('id', recibo.recebimento_id)
    .single()
  if (erroRec) throw erroRec

  const [cliente, config] = await Promise.all([
    supabase.from('clientes').select('nome, cpf_cnpj, endereco').eq('id', rec.cliente_id).single(),
    supabase.from('configuracoes').select('*').single(),
  ])
  if (cliente.error) throw cliente.error
  if (config.error) throw config.error
  const c = config.data

  const dados: DadosRecibo = {
    ano: recibo.ano,
    numero: recibo.numero,
    dataEmissao: recibo.data_emissao,
    valorCentavos: centavosDoBanco(rec.valor),
    dataRecebimento: rec.data_recebimento,
    formaPagamento: rec.forma_pagamento,
    parcelaNumero: rec.parcela_numero,
    totalParcelas: rec.total_parcelas ?? 0,
    trabalhoDescricao: rec.trabalho_descricao,
    cliente: {
      nome: cliente.data.nome,
      cpfCnpj: cliente.data.cpf_cnpj ?? '',
      endereco: cliente.data.endereco ?? '',
    },
    estudio: {
      razaoSocial: c.razao_social ?? '',
      nomeFantasia: c.nome_fantasia,
      cnpj: c.cnpj ?? '',
      endereco: c.endereco ?? '',
      cidade: c.cidade,
      uf: c.uf,
      telefone: c.telefone,
      email: c.email,
      responsavel: c.responsavel_assinatura ?? '',
    },
  }
  const logo = c.logo_path ? await carregarLogo(c.logo_path) : null
  return { recibo, dados, logo }
}

function jaExiste(erro: unknown): boolean {
  const e = erro as { statusCode?: string | number; status?: number; message?: string }
  return String(e.statusCode ?? e.status) === '409' || /already exists/i.test(e.message ?? '')
}

export async function baixarPdfArquivado(caminho: string, ano: number, numero: number): Promise<ArquivoRecibo> {
  const { data, error } = await supabase.storage.from('recibos').download(caminho)
  if (error) throw error
  return { blob: data, nome: nomeArquivoRecibo(ano, numero), numero: numeroRecibo(ano, numero) }
}

/** Gera o PDF de um recibo que ainda não tem arquivo, guarda e devolve para baixar. */
export async function gerarEArquivarPdf(reciboId: string): Promise<ArquivoRecibo> {
  const { recibo, dados, logo } = await carregarDados(reciboId)
  if (recibo.arquivo_pdf) return baixarPdfArquivado(recibo.arquivo_pdf, recibo.ano, recibo.numero)

  const caminho = caminhoPdfRecibo(recibo.ano, recibo.numero)
  const blob = await gerarPdfRecibo(dados, logo)
  const envio = await supabase.storage.from('recibos').upload(caminho, blob, { contentType: 'application/pdf', upsert: false })
  // Já existe: um envio anterior chegou ao Storage mas não gravou o caminho.
  // Vale o arquivo guardado, que é o que se liga ao recibo.
  const reaproveitado = !!envio.error && jaExiste(envio.error)
  if (envio.error && !reaproveitado) throw envio.error

  const { error } = await supabase.from('recibos').update({ arquivo_pdf: caminho }).eq('id', recibo.id).is('arquivo_pdf', null)
  if (error) throw error

  if (reaproveitado) return baixarPdfArquivado(caminho, recibo.ano, recibo.numero)
  return { blob, nome: nomeArquivoRecibo(recibo.ano, recibo.numero), numero: numeroRecibo(recibo.ano, recibo.numero) }
}

/** Reserva o número e gera o PDF. Se o PDF falhar, o recibo continua emitido. */
export async function emitirRecibo(recebimentoId: string): Promise<ArquivoRecibo> {
  const { data: recibo, error } = await supabase.rpc('emitir_recibo', { p_recebimento_id: recebimentoId })
  if (error) throw error
  try {
    return await gerarEArquivarPdf(recibo.id)
  } catch (erro) {
    console.error(erro)
    throw new ErroPdfRecibo(numeroRecibo(recibo.ano, recibo.numero))
  }
}

/** Mensagem para a tela: erros do banco já vêm em português; o resto vira uma frase simples. */
export function mensagemErroRecibo(erro: unknown): string {
  if (erro instanceof ErroPdfRecibo) return erro.message
  if (erro && typeof erro === 'object' && 'code' in erro) return mensagemErroBanco(erro)
  return 'Não foi possível gerar ou baixar o PDF. Verifique a conexão e tente de novo.'
}

/** Entrega o arquivo ao navegador para baixar. */
export function salvarArquivo({ blob, nome }: ArquivoRecibo) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
