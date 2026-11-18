import { describe, expect, it } from 'vitest'
import { ehDataValida, formatarData, formatarMes, hojeISO, somarMeses } from './datas'
import { centavosDeTexto, centavosDoBanco, centavosParaBanco, centavosParaCampo, formatarReais } from './dinheiro'
import { cnpjValido, cpfValido, documentoValido, formatarDocumento, soDigitos } from './documentos'

describe('dinheiro', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234,5', 123450],
    ['R$ 3.000,00', 300000],
    ['300', 30000],
    ['3000.00', 300000],
    ['1.234', 123400],
    ['0,01', 1],
    [' 600 ', 60000],
  ])('lê "%s" como %i centavos', (texto, esperado) => {
    expect(centavosDeTexto(texto)).toBe(esperado)
  })

  it.each(['', 'abc', '1,234,56', '12,345', '1.23,00', '-5', '1e3'])('recusa "%s"', (texto) => {
    expect(centavosDeTexto(texto)).toBeNull()
  })

  it('formata em reais', () => {
    expect(formatarReais(123456)).toBe('R$ 1.234,56')
    expect(formatarReais(5)).toBe('R$ 0,05')
    expect(formatarReais(100000000)).toBe('R$ 1.000.000,00')
    expect(formatarReais(-30000)).toBe('-R$ 300,00')
    expect(centavosParaCampo(300000)).toBe('3.000,00')
  })

  it('converte para o banco e de volta', () => {
    expect(centavosParaBanco(300000)).toBe('3000.00')
    expect(centavosParaBanco(1)).toBe('0.01')
    expect(centavosDoBanco(3000)).toBe(300000)
    expect(centavosDoBanco(333.34)).toBe(33334)
    expect(centavosDoBanco(0.29)).toBe(29)
    expect(centavosDoBanco(null)).toBe(0)
  })
})

describe('datas', () => {
  it('hoje é no fuso de São Paulo', () => {
    // 02:00 UTC de 1º de março = 23:00 de 28/02 em São Paulo
    expect(hojeISO(new Date('2026-03-01T02:00:00Z'))).toBe('2026-02-28')
  })

  it('formata datas', () => {
    expect(formatarData('2026-03-09')).toBe('09/03/2026')
    expect(formatarData(null)).toBe('')
    expect(formatarMes('2026-03')).toBe('março de 2026')
  })

  it('soma meses mantendo o dia ou usando o último do mês', () => {
    expect(somarMeses('2026-01-15', 1)).toBe('2026-02-15')
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2026-01-31', 2)).toBe('2026-03-31')
    expect(somarMeses('2027-12-31', 2)).toBe('2028-02-29')
    expect(somarMeses('2026-11-10', 3)).toBe('2027-02-10')
  })

  it('valida datas', () => {
    expect(ehDataValida('2026-02-28')).toBe(true)
    expect(ehDataValida('2026-02-29')).toBe(false)
    expect(ehDataValida('2026-13-01')).toBe(false)
    expect(ehDataValida('')).toBe(false)
  })
})

describe('documentos', () => {
  it('valida CPF', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('529.982.247-24')).toBe(false)
    expect(cpfValido('111.111.111-11')).toBe(false)
    expect(cpfValido('123')).toBe(false)
  })

  it('valida CNPJ', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true)
    expect(cnpjValido('11.222.333/0001-80')).toBe(false)
    expect(cnpjValido('00000000000000')).toBe(false)
  })

  it('usa a regra do tipo de pessoa', () => {
    expect(documentoValido('PF', '52998224725')).toBe(true)
    expect(documentoValido('PJ', '52998224725')).toBe(false)
  })

  it('formata e limpa', () => {
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25')
    expect(formatarDocumento('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatarDocumento(null)).toBe('')
    expect(soDigitos('529.982.247-25')).toBe('52998224725')
  })
})
