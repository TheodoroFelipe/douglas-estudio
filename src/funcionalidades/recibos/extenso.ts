// Valor em reais por extenso, para o recibo. Trabalha em centavos (inteiro).

const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
]
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
]

/** 0 a 999 → "cento e vinte e três" ("" para zero). */
function grupoPorExtenso(n: number): string {
  if (n === 100) return 'cem'
  const partes: string[] = []
  const centena = Math.floor(n / 100)
  const resto = n % 100
  if (centena) partes.push(CENTENAS[centena])
  if (resto < 20) {
    if (resto) partes.push(UNIDADES[resto])
  } else {
    partes.push(DEZENAS[Math.floor(resto / 10)])
    if (resto % 10) partes.push(UNIDADES[resto % 10])
  }
  return partes.join(' e ')
}

// Escalas de 1000 em 1000: [singular, plural]. "mil" não leva "um".
const ESCALAS: [string, string][] = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
]

/** Número inteiro por extenso: 1250 → "mil duzentos e cinquenta". */
export function inteiroPorExtenso(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Número inválido para escrever por extenso.')
  if (n === 0) return 'zero'
  if (n >= 1e12) throw new Error('Valor grande demais para escrever por extenso.')

  // Grupos de três dígitos, do maior para o menor.
  const grupos: { valor: number; escala: number }[] = []
  let resto = n
  for (let escala = 0; resto > 0; escala++) {
    grupos.unshift({ valor: resto % 1000, escala })
    resto = Math.floor(resto / 1000)
  }
  const naoZero = grupos.filter((g) => g.valor > 0)

  return naoZero
    .map((g, i) => {
      const [singular, plural] = ESCALAS[g.escala]
      let texto: string
      if (g.escala === 1 && g.valor === 1) texto = 'mil'
      else if (g.escala === 0) texto = grupoPorExtenso(g.valor)
      else texto = `${grupoPorExtenso(g.valor)} ${g.valor === 1 ? singular : plural}`

      // "e" antes do último grupo quando ele é menor que 100 ou uma centena redonda:
      // "mil e duzentos", "dois mil e um", mas "mil duzentos e cinquenta".
      const ultimo = i === naoZero.length - 1
      if (i > 0 && ultimo && (g.valor < 100 || g.valor % 100 === 0)) return `e ${texto}`
      return texto
    })
    .join(' ')
}

/**
 * Centavos → valor por extenso em reais.
 * 300000 → "três mil reais"; 120050 → "mil e duzentos reais e cinquenta centavos".
 */
export function valorPorExtenso(centavos: number): string {
  if (!Number.isSafeInteger(centavos) || centavos < 0) throw new Error('Valor inválido.')
  const reais = Math.floor(centavos / 100)
  const cents = centavos % 100

  const partes: string[] = []
  if (reais > 0) {
    // "um milhão de reais", mas "um milhão e cem mil reais".
    const redondoEmMilhao = reais >= 1e6 && reais % 1e6 === 0
    const moeda = reais === 1 ? 'real' : redondoEmMilhao ? 'de reais' : 'reais'
    partes.push(`${inteiroPorExtenso(reais)} ${moeda}`)
  }
  if (cents > 0) partes.push(`${inteiroPorExtenso(cents)} ${cents === 1 ? 'centavo' : 'centavos'}`)
  if (partes.length === 0) return 'zero reais'
  return partes.join(' e ')
}
