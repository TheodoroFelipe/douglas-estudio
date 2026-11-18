// Período do painel, lido da URL. Meses no formato "AAAA-MM".
import { formatarMes } from '../../lib/datas'

export const TIPOS_PERIODO = {
  mes: 'Mês',
  '3m': 'Últimos 3 meses',
  '6m': 'Últimos 6 meses',
  '12m': 'Últimos 12 meses',
  ano: 'Este ano',
  'ano-anterior': 'Ano anterior',
  personalizado: 'Personalizado',
} as const
export type TipoPeriodo = keyof typeof TIPOS_PERIODO

export type Periodo = {
  tipo: TipoPeriodo
  inicio: string
  fim: string
  rotulo: string
  /** Meses mostrados no gráfico (no modo mês, os 6 meses até o escolhido). */
  graficoInicio: string
  graficoFim: string
  /** Mês em destaque no gráfico (só no modo mês). */
  destaque: string | null
}

const MAXIMO_MESES = 120

function valido(mes: string | null): mes is string {
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return false
  const m = Number(mes.slice(5))
  return m >= 1 && m <= 12
}

/** somarMesesAM("2026-11", 2) → "2027-01" */
export function somarMesesAM(mes: string, n: number): string {
  const indice = Number(mes.slice(0, 4)) * 12 + Number(mes.slice(5)) - 1 + n
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`
}

export function mesesEntre(inicio: string, fim: string): string[] {
  const meses: string[] = []
  for (let m = inicio; m <= fim && meses.length < MAXIMO_MESES; m = somarMesesAM(m, 1)) meses.push(m)
  return meses
}

const abreviados = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2026-11" → "nov/2026" */
export function mesCurto(mes: string): string {
  return `${abreviados[Number(mes.slice(5)) - 1]}/${mes.slice(0, 4)}`
}

/** Eixo do gráfico: "nov"; o ano aparece em janeiro e no primeiro mês ("jan/27"). */
export function rotuloEixo(mes: string, primeiro: boolean): string {
  const nome = abreviados[Number(mes.slice(5)) - 1]
  return primeiro || mes.endsWith('-01') ? `${nome}/${mes.slice(2, 4)}` : nome
}

type Parametros = { get: (chave: string) => string | null }

export function resolverPeriodo(parametros: Parametros, hoje: string): Periodo {
  const atual = hoje.slice(0, 7)
  const tipo = (parametros.get('periodo') ?? 'mes') as TipoPeriodo
  const ano = atual.slice(0, 4)

  const intervalo = (t: TipoPeriodo, inicio: string, fim: string, rotulo: string): Periodo => ({
    tipo: t, inicio, fim, rotulo, graficoInicio: inicio, graficoFim: fim, destaque: null,
  })

  switch (tipo) {
    case '3m':
    case '6m':
    case '12m': {
      const n = Number(tipo.replace('m', ''))
      const inicio = somarMesesAM(atual, -(n - 1))
      return intervalo(tipo, inicio, atual, `${mesCurto(inicio)} a ${mesCurto(atual)}`)
    }
    case 'ano':
      return intervalo('ano', `${ano}-01`, `${ano}-12`, ano)
    case 'ano-anterior': {
      const anterior = String(Number(ano) - 1)
      return intervalo('ano-anterior', `${anterior}-01`, `${anterior}-12`, anterior)
    }
    case 'personalizado': {
      let de = valido(parametros.get('de')) ? parametros.get('de')! : atual
      let ate = valido(parametros.get('ate')) ? parametros.get('ate')! : atual
      if (de > ate) [de, ate] = [ate, de]
      if (mesesEntre(de, ate).length >= MAXIMO_MESES) de = somarMesesAM(ate, -(MAXIMO_MESES - 1))
      return intervalo('personalizado', de, ate, de === ate ? formatarMes(de) : `${mesCurto(de)} a ${mesCurto(ate)}`)
    }
    default: {
      const mes = valido(parametros.get('mes')) ? parametros.get('mes')! : atual
      return {
        tipo: 'mes', inicio: mes, fim: mes, rotulo: formatarMes(mes),
        graficoInicio: somarMesesAM(mes, -5), graficoFim: mes, destaque: mes,
      }
    }
  }
}

/** Primeiro e último dia, para a função do banco. */
export function limitesDoPeriodo(inicio: string, fim: string): { inicio: string; fim: string } {
  const [a, m] = fim.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return { inicio: `${inicio}-01`, fim: `${fim}-${String(ultimoDia).padStart(2, '0')}` }
}
