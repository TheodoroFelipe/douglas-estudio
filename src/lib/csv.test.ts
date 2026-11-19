import { describe, expect, it } from 'vitest'
import { gerarCsv, valorCsv } from './csv'

describe('gerarCsv', () => {
  it('começa com BOM, separa com ; e termina linhas com CRLF', () => {
    expect(gerarCsv(['Nome', 'Valor'], [['Ana', '10,00']])).toBe('﻿Nome;Valor\r\nAna;10,00\r\n')
  })

  it('mantém acentos e deixa vazio o que é nulo', () => {
    expect(gerarCsv(['a', 'b', 'c'], [['Impressão e álbum', null, undefined]])).toBe('﻿a;b;c\r\nImpressão e álbum;;\r\n')
  })

  it('põe entre aspas o texto com ;, aspas, quebra de linha ou espaço nas pontas', () => {
    const csv = gerarCsv(['x'], [['Álbum; capa dura'], ['Foto "P&B"'], ['linha 1\nlinha 2'], [' espaço ']])
    expect(csv.split('\r\n').slice(1, 5)).toEqual(['"Álbum; capa dura"', '"Foto ""P&B"""', '"linha 1\nlinha 2"', '" espaço "'])
  })

  it('não deixa texto virar fórmula no Excel, mas mantém números negativos', () => {
    const csv = gerarCsv(['x'], [['=SOMA(A1:A9)'], ['+55 45 9999'], ['@usuario'], ['-12,50'], ['- desconto']])
    expect(csv.split('\r\n').slice(1, 6)).toEqual(["'=SOMA(A1:A9)", "'+55 45 9999", "'@usuario", '-12,50', "'- desconto"])
  })
})

it('texto fixo (chave de acesso) não vira notação científica no Excel', () => {
  const chave = '41083042211444777000161000000000004526111234567890'
  expect(gerarCsv(['Chave'], [[{ textoFixo: chave }]])).toBe(`﻿Chave\r\n"=""${chave}"""\r\n`)
})

describe('valorCsv', () => {
  it('centavos com vírgula decimal, sem milhar nem R$', () => {
    expect(valorCsv(123456)).toBe('1234,56')
    expect(valorCsv(5)).toBe('0,05')
    expect(valorCsv(0)).toBe('0,00')
    expect(valorCsv(-1050)).toBe('-10,50')
  })
})
