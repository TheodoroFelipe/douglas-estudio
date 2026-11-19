// CSV para abrir direto no Excel em português: separador ";", decimal ",",
// UTF-8 com BOM (sem ele o Excel estraga os acentos) e quebra de linha CRLF.
import { centavosParaBanco } from './dinheiro'

/** textoFixo: o Excel mostra como está (sem virar número, data ou notação científica). */
export type Celula = string | null | undefined | { textoFixo: string }

const BOM = '﻿'
const NUMERO = /^-?\d+(,\d+)?$/

/**
 * Texto que começa com = + - @ vira fórmula no Excel (até em CSV): ganha um
 * apóstrofo na frente. Números nossos ("-12,50") passam como estão.
 */
function protegerFormula(texto: string): string {
  return /^[=+\-@\t\r]/.test(texto) && !NUMERO.test(texto) ? `'${texto}` : texto
}

function celulaCsv(valor: Celula): string {
  if (valor === null || valor === undefined) return ''
  const texto = typeof valor === 'string' ? protegerFormula(valor) : `="${valor.textoFixo.replace(/"/g, '""')}"`
  return /[;"\r\n]/.test(texto) || texto !== texto.trim() ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function gerarCsv(cabecalho: string[], linhas: Celula[][]): string {
  const todas = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(';'))
  return `${BOM}${todas.join('\r\n')}\r\n`
}

/** 123456 → "1234,56": número que o Excel em pt-BR soma (sem "R$" nem ponto de milhar). */
export function valorCsv(centavos: number): string {
  return centavosParaBanco(centavos).replace('.', ',')
}

export function arquivoCsv(conteudo: string): Blob {
  return new Blob([conteudo], { type: 'text/csv;charset=utf-8' })
}
