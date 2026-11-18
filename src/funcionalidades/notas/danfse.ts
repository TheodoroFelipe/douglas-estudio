// Leitura do PDF da NFS-e (DANFSe v2.0, o PDF que o Emissor Nacional entrega).
// O texto do PDF sai como pares "RÓTULO", "valor"; pegamos o valor depois de cada rótulo.
// Tudo o que é lido continua editável no formulário.
import { soDigitos } from '../../lib/documentos'
import { centavosDeTexto } from '../../lib/dinheiro'

export type DadosDanfse = {
  numero: string | null
  chave: string | null
  dataEmissao: string | null
  dataCompetencia: string | null
  valorCentavos: number | null
  codigoServico: string | null
  descricaoServico: string | null
  /** Alíquota em centésimos (2,00% → 200); null quando vem "-" (Simples). */
  aliquotaCentesimos: number | null
  prestadorDocumento: string | null
  tomadorDocumento: string | null
  tomadorNome: string | null
  situacao: string | null
  /** "1" produção; "2" homologação (nota de teste). */
  tipoAmbiente: string | null
}

function vazio(texto: string | undefined): string | null {
  const limpo = texto?.trim() ?? ''
  return limpo === '' || limpo === '-' ? null : limpo
}

/** Valor logo depois do rótulo (procurando a partir de "inicio"). */
function apos(linhas: string[], rotulo: string, inicio = 0): string | null {
  const i = linhas.indexOf(rotulo, inicio)
  return i < 0 ? null : vazio(linhas[i + 1])
}

/** "16/11/2026 14:59:39" → "2026-11-16" */
function dataISO(texto: string | null): string | null {
  const m = texto?.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

export function lerDanfse(linhas: string[]): DadosDanfse {
  const l = linhas.map((s) => s.trim()).filter(Boolean)
  const iPrestador = l.indexOf('PRESTADOR / FORNECEDOR')
  const iTomador = l.indexOf('TOMADOR / ADQUIRENTE')

  const chave = soDigitos(apos(l, 'CHAVE DE ACESSO DA NFS-e') ?? '')
  const codigo = apos(l, 'Código de Tributação Nacional/Municipal')?.split('/')[0].trim() ?? null
  const valor = apos(l, 'VALOR DA OPERAÇÃO / SERVIÇO')
  const aliquota = apos(l, 'Alíquota Aplicada')
  const ambiente = l.find((s) => s.startsWith('Tipo de Ambiente:'))

  return {
    numero: apos(l, 'NÚMERO DA NFS-e'),
    chave: chave.length === 50 ? chave : null,
    dataEmissao: dataISO(apos(l, 'DATA E HORA DA EMISSÃO DA NFS-e')),
    dataCompetencia: dataISO(apos(l, 'COMPETÊNCIA DA NFS-e')),
    valorCentavos: valor ? centavosDeTexto(valor) : null,
    codigoServico: codigo || null,
    descricaoServico: apos(l, 'Descrição do Serviço'),
    aliquotaCentesimos: aliquota ? centavosDeTexto(aliquota.replace('%', '')) : null,
    prestadorDocumento: iPrestador < 0 ? null : soDigitos(apos(l, 'CNPJ / CPF / NIF', iPrestador) ?? '') || null,
    tomadorDocumento: iTomador < 0 ? null : soDigitos(apos(l, 'CNPJ / CPF / NIF', iTomador) ?? '') || null,
    tomadorNome: iTomador < 0 ? null : apos(l, 'Nome / Nome Empresarial', iTomador),
    situacao: apos(l, 'SITUAÇÃO DA NFS-e'),
    tipoAmbiente: ambiente ? ambiente.replace('Tipo de Ambiente:', '').trim() : null,
  }
}

export function pareceDanfse(linhas: string[]): boolean {
  return linhas.some((s) => s.includes('DANFSe')) && linhas.includes('CHAVE DE ACESSO DA NFS-e')
}

/** Texto da 1ª página do PDF. O pdf.js só é carregado aqui (import dinâmico). */
export async function extrairLinhasPdf(arquivo: File): Promise<string[]> {
  const [pdfjs, { default: urlWorker }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = urlWorker
  const tarefa = pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) })
  try {
    const documento = await tarefa.promise
    const pagina = await documento.getPage(1)
    const { items } = await pagina.getTextContent()
    return items.map((item) => ('str' in item ? item.str : '')).filter((s) => s.trim())
  } finally {
    await tarefa.destroy()
  }
}
