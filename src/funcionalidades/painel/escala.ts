// Escala do eixo Y dos gráficos (valores em centavos) e rótulos dos ticks.

/** Passo "redondo" (1, 2, 2,5 ou 5 × 10^n) para ~4 divisões. */
function passoRedondo(amplitude: number, divisoes: number): number {
  const bruto = amplitude / divisoes
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const fracao = bruto / potencia
  const fator = fracao <= 1 ? 1 : fracao <= 2 ? 2 : fracao <= 2.5 ? 2.5 : fracao <= 5 ? 5 : 10
  return fator * potencia
}

export type Escala = { min: number; max: number; ticks: number[] }

/** Sempre inclui o zero; aceita negativos (resultado no prejuízo). */
export function escalaY(valores: number[], divisoes = 4): Escala {
  const minimo = Math.min(0, ...valores)
  const maximo = Math.max(0, ...valores)
  if (minimo === 0 && maximo === 0) return { min: 0, max: 100000, ticks: [0, 25000, 50000, 75000, 100000] }
  // Passo em reais inteiros (100 centavos) no mínimo.
  const passo = Math.max(100, passoRedondo(maximo - minimo, divisoes))
  const min = Math.floor(minimo / passo) * passo
  const max = Math.ceil(maximo / passo) * passo
  const ticks: number[] = []
  for (let t = min; t <= max + passo / 2; t += passo) ticks.push(Math.round(t))
  return { min, max, ticks }
}

/** Ticks: "R$ 0", "R$ 2.500", "R$ 15 mil", "R$ 1,2 mi". Uma escala só por eixo. */
export function formatarTick(centavos: number, maiorDoEixo: number): string {
  const reais = centavos / 100
  const sinal = reais < 0 ? '-' : ''
  const abs = Math.abs(reais)
  if (Math.abs(maiorDoEixo) / 100 >= 1_000_000) return `${sinal}R$ ${formatarDecimal(abs / 1_000_000)} mi`
  if (Math.abs(maiorDoEixo) / 100 >= 10_000) return `${sinal}R$ ${formatarDecimal(abs / 1000)} mil`
  return `${sinal}R$ ${Math.round(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function formatarDecimal(n: number): string {
  const arredondado = Math.round(n * 10) / 10
  return Number.isInteger(arredondado) ? String(arredondado) : String(arredondado).replace('.', ',')
}
