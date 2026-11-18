// Gera o PDF do recibo no navegador. O jsPDF é carregado só aqui (import dinâmico),
// para não pesar o resto do sistema.
import { montarTextoRecibo, type DadosRecibo } from './conteudo'

export type Logo = { dados: Uint8Array; formato: 'PNG' | 'JPEG' }

// A4 em milímetros.
const LARGURA = 210
const MARGEM = 20
const UTIL = LARGURA - 2 * MARGEM

export async function gerarPdfRecibo(dados: DadosRecibo, logo: Logo | null): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const texto = montarTextoRecibo(dados)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  doc.setProperties({ title: `Recibo ${texto.numero.replace('Nº ', '')}`, author: dados.estudio.razaoSocial })

  // Cabeçalho: logo à esquerda, dados do estúdio à direita.
  let y = MARGEM
  let alturaCabecalho = 0
  if (logo) {
    const props = doc.getImageProperties(logo.dados)
    const escala = Math.min(45 / props.width, 22 / props.height)
    const w = props.width * escala
    const h = props.height * escala
    doc.addImage(logo.dados, logo.formato, MARGEM, y, w, h)
    alturaCabecalho = h
  }
  const [nome, ...linhasEstudio] = texto.cabecalho
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(28, 25, 23)
  doc.text(nome, LARGURA - MARGEM, y + 4, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(87, 83, 78)
  linhasEstudio.forEach((linha, i) => doc.text(linha, LARGURA - MARGEM, y + 9 + i * 4.2, { align: 'right' }))
  alturaCabecalho = Math.max(alturaCabecalho, 9 + linhasEstudio.length * 4.2)

  y += alturaCabecalho + 6
  doc.setDrawColor(214, 211, 209).setLineWidth(0.3).line(MARGEM, y, LARGURA - MARGEM, y)

  // Título, número e valor.
  y += 14
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(28, 25, 23)
  doc.text(texto.titulo, MARGEM, y)
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(87, 83, 78)
  doc.text(texto.numero, MARGEM, y + 7)

  doc.setFont('helvetica', 'bold').setFontSize(15)
  const larguraValor = doc.getTextWidth(texto.valor) + 12
  doc.setDrawColor(28, 25, 23).setLineWidth(0.5)
  doc.roundedRect(LARGURA - MARGEM - larguraValor, y - 8, larguraValor, 13, 2, 2)
  doc.setTextColor(28, 25, 23).text(texto.valor, LARGURA - MARGEM - 6, y + 0.5, { align: 'right' })

  // Corpo.
  y += 22
  doc.setFont('helvetica', 'normal').setFontSize(11.5).setTextColor(28, 25, 23)
  const linhas: string[] = doc.splitTextToSize(texto.corpo, UTIL)
  doc.text(linhas, MARGEM, y, { lineHeightFactor: 1.55 })
  y += linhas.length * 11.5 * 1.55 * 0.3528 + 10

  // Local e data, assinatura.
  doc.text(texto.localData, LARGURA - MARGEM, y, { align: 'right' })
  y += 30
  const centro = LARGURA / 2
  doc.setDrawColor(28, 25, 23).setLineWidth(0.3).line(centro - 45, y, centro + 45, y)
  texto.assinatura.forEach((linha, i) => {
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal').setFontSize(i === 0 ? 10.5 : 9)
    doc.setTextColor(i === 0 ? 28 : 87, i === 0 ? 25 : 83, i === 0 ? 23 : 78)
    doc.text(linha, centro, y + 5 + i * 4.6, { align: 'center' })
  })

  // Rodapé.
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120, 113, 108)
  doc.text(doc.splitTextToSize(texto.rodape, UTIL), centro, 282, { align: 'center' })

  return doc.output('blob')
}
