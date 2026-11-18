import { describe, expect, it } from 'vitest'
import {
  caminhoPdfRecibo,
  dataPorExtenso,
  montarTextoRecibo,
  nomeArquivoRecibo,
  numeroRecibo,
  referenciaRecibo,
  type DadosRecibo,
} from './conteudo'
import { inteiroPorExtenso, valorPorExtenso } from './extenso'
import { gerarPdfRecibo } from './pdf'

describe('valorPorExtenso', () => {
  it.each([
    [300000, 'três mil reais'],
    [60000, 'seiscentos reais'],
    [10000, 'cem reais'],
    [11000, 'cento e dez reais'],
    [120050, 'mil e duzentos reais e cinquenta centavos'],
    [125000, 'mil duzentos e cinquenta reais'],
    [200100, 'dois mil e um reais'],
    [101, 'um real e um centavo'],
    [50, 'cinquenta centavos'],
    [1900, 'dezenove reais'],
    [7199, 'setenta e um reais e noventa e nove centavos'],
    [100000000, 'um milhão de reais'],
    [110000000, 'um milhão e cem mil reais'],
    [100100000, 'um milhão e mil reais'],
    [200000000, 'dois milhões de reais'],
    [123456789, 'um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete reais e oitenta e nove centavos'],
    [99999999999, 'novecentos e noventa e nove milhões novecentos e noventa e nove mil novecentos e noventa e nove reais e noventa e nove centavos'],
    [0, 'zero reais'],
  ])('%i centavos → %s', (centavos, esperado) => {
    expect(valorPorExtenso(centavos)).toBe(esperado)
  })

  it('números inteiros', () => {
    expect(inteiroPorExtenso(1000)).toBe('mil')
    expect(inteiroPorExtenso(1001)).toBe('mil e um')
    expect(inteiroPorExtenso(2014)).toBe('dois mil e quatorze')
    expect(inteiroPorExtenso(1000000000)).toBe('um bilhão')
  })

  it('recusa valor inválido', () => {
    expect(() => valorPorExtenso(-1)).toThrow()
    expect(() => valorPorExtenso(1.5)).toThrow()
  })
})

describe('numeração e referência', () => {
  it('número, caminho e nome do arquivo com 4 dígitos', () => {
    expect(numeroRecibo(2026, 1)).toBe('2026/0001')
    expect(caminhoPdfRecibo(2026, 12)).toBe('2026/0012.pdf')
    expect(caminhoPdfRecibo(2026, 12345)).toBe('2026/12345.pdf')
    expect(nomeArquivoRecibo(2026, 1)).toBe('recibo-2026-0001.pdf')
  })

  it('referência: sinal, parcela N de M ou só o trabalho', () => {
    expect(referenciaRecibo(0, 8, 'Formatura X')).toBe('sinal - Formatura X')
    expect(referenciaRecibo(2, 8, 'Formatura X')).toBe('parcela 2 de 8 - Formatura X')
    expect(referenciaRecibo(null, 8, 'Formatura X')).toBe('Formatura X')
  })

  it('data por extenso', () => {
    expect(dataPorExtenso('2026-11-08')).toBe('8 de novembro de 2026')
    expect(dataPorExtenso('2027-03-01')).toBe('1 de março de 2027')
  })
})

const dados: DadosRecibo = {
  ano: 2026,
  numero: 1,
  dataEmissao: '2026-11-18',
  valorCentavos: 60000,
  dataRecebimento: '2026-11-17',
  formaPagamento: 'pix',
  parcelaNumero: 0,
  totalParcelas: 8,
  trabalhoDescricao: 'Formatura Medicina UNILA 2026',
  cliente: { nome: 'Comissão Medicina UNILA 2026', cpfCnpj: '11222333000181', endereco: 'Av. Tancredo Neves, 6731' },
  estudio: {
    razaoSocial: 'Douglas Guimarães Fotografia LTDA',
    nomeFantasia: 'Douglas Guimarães Fotografia',
    cnpj: '11444777000161',
    endereco: 'Rua Teste, 100',
    cidade: 'Foz do Iguaçu',
    uf: 'PR',
    telefone: '(45) 99999-0000',
    email: null,
    responsavel: 'Douglas Guimarães',
  },
}

describe('montarTextoRecibo', () => {
  it('monta o texto com valor por extenso e referência', () => {
    const texto = montarTextoRecibo(dados)
    expect(texto.numero).toBe('Nº 2026/0001')
    expect(texto.valor).toBe('R$ 600,00')
    expect(texto.corpo).toContain('Recebemos de Comissão Medicina UNILA 2026, CNPJ 11.222.333/0001-81')
    expect(texto.corpo).toContain('a importância de R$ 600,00 (seiscentos reais)')
    expect(texto.corpo).toContain('referente a sinal - Formatura Medicina UNILA 2026, paga em 17/11/2026 por Pix.')
    expect(texto.localData).toBe('Foz do Iguaçu/PR, 18 de novembro de 2026.')
    expect(texto.assinatura).toEqual(['Douglas Guimarães', 'Douglas Guimarães Fotografia LTDA', 'CNPJ 11.444.777/0001-61'])
    expect(texto.cabecalho.at(-1)).toBe('(45) 99999-0000')
  })

  it('pessoa física aparece com CPF', () => {
    const texto = montarTextoRecibo({ ...dados, cliente: { ...dados.cliente, nome: 'Ana', cpfCnpj: '52998224725' } })
    expect(texto.corpo).toContain('Recebemos de Ana, CPF 529.982.247-25')
  })
})

describe('gerarPdfRecibo', () => {
  it('gera um PDF', async () => {
    const blob = await gerarPdfRecibo(dados, null)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(blob.size).toBeGreaterThan(1000)
  })
})
