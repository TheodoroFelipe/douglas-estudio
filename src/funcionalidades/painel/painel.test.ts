import { describe, expect, it } from 'vitest'
import { agruparAlertas, linkDoAlerta, type Alerta } from './alertas'
import { escalaY, formatarTick } from './escala'
import { limitesDoPeriodo, mesesEntre, resolverPeriodo, rotuloEixo, somarMesesAM } from './periodo'

const params = (obj: Record<string, string>) => new URLSearchParams(obj)
const HOJE = '2026-11-18'

describe('período', () => {
  it('mês: padrão é o atual; o gráfico mostra os 6 meses até ele', () => {
    expect(resolverPeriodo(params({}), HOJE)).toEqual({
      tipo: 'mes', inicio: '2026-11', fim: '2026-11', rotulo: 'novembro de 2026',
      graficoInicio: '2026-06', graficoFim: '2026-11', destaque: '2026-11',
    })
    expect(resolverPeriodo(params({ mes: '2026-02' }), HOJE)).toMatchObject({ inicio: '2026-02', graficoInicio: '2025-09' })
    expect(resolverPeriodo(params({ mes: '2026-13' }), HOJE).inicio).toBe('2026-11')
  })

  it('atalhos terminam no mês atual', () => {
    expect(resolverPeriodo(params({ periodo: '3m' }), HOJE)).toMatchObject({ inicio: '2026-09', fim: '2026-11', rotulo: 'set/2026 a nov/2026' })
    expect(resolverPeriodo(params({ periodo: '12m' }), HOJE)).toMatchObject({ inicio: '2025-12', fim: '2026-11' })
    expect(resolverPeriodo(params({ periodo: 'ano' }), HOJE)).toMatchObject({ inicio: '2026-01', fim: '2026-12', rotulo: '2026' })
    expect(resolverPeriodo(params({ periodo: 'ano-anterior' }), HOJE)).toMatchObject({ inicio: '2025-01', fim: '2025-12' })
  })

  it('personalizado: inverte se vier ao contrário e limita a 10 anos', () => {
    expect(resolverPeriodo(params({ periodo: 'personalizado', de: '2026-05', ate: '2026-02' }), HOJE)).toMatchObject({
      inicio: '2026-02', fim: '2026-05', destaque: null,
    })
    expect(resolverPeriodo(params({ periodo: 'personalizado', de: '2000-01', ate: '2026-11' }), HOJE).inicio).toBe('2016-12')
  })

  it('meses, limites e rótulos', () => {
    expect(somarMesesAM('2026-11', 2)).toBe('2027-01')
    expect(somarMesesAM('2026-01', -1)).toBe('2025-12')
    expect(mesesEntre('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
    expect(limitesDoPeriodo('2028-01', '2028-02')).toEqual({ inicio: '2028-01-01', fim: '2028-02-29' })
    expect(rotuloEixo('2026-11', true)).toBe('nov/26')
    expect(rotuloEixo('2026-12', false)).toBe('dez')
    expect(rotuloEixo('2027-01', false)).toBe('jan/27')
  })
})

describe('escala do gráfico', () => {
  it('inclui o zero e usa passos redondos', () => {
    expect(escalaY([300000, 120000])).toEqual({ min: 0, max: 300000, ticks: [0, 100000, 200000, 300000] })
    const negativa = escalaY([30000, -25900])
    expect(negativa.min).toBeLessThan(0)
    expect(negativa.ticks).toContain(0)
    expect(escalaY([])).toMatchObject({ min: 0 })
  })

  it('ticks em reais, compactos a partir de 10 mil', () => {
    expect(formatarTick(250000, 300000)).toBe('R$ 2.500')
    expect(formatarTick(1500000, 2000000)).toBe('R$ 15 mil')
    expect(formatarTick(-500000, 2000000)).toBe('-R$ 5 mil')
    expect(formatarTick(120000000, 150000000)).toBe('R$ 1,2 mi')
  })
})

describe('alertas', () => {
  const alerta = (tipo: string, extra: Partial<Alerta> = {}): Alerta => ({
    tipo, trabalho_id: 't1', referencia_id: 'r1', descricao: '', trabalho_descricao: 'Formatura', data_referencia: '2026-11-01', ...extra,
  })

  it('agrupa na ordem de importância e ordena por data', () => {
    const grupos = agruparAlertas([
      alerta('recibo_pendente'),
      alerta('nota_pendente', { data_referencia: '2026-11-10', trabalho_id: 't2' }),
      alerta('nota_pendente', { data_referencia: '2026-10-01' }),
    ])
    expect(grupos.map((g) => g.tipo)).toEqual(['nota_pendente', 'recibo_pendente'])
    expect(grupos[0].itens.map((a) => a.data_referencia)).toEqual(['2026-10-01', '2026-11-10'])
  })

  it('cada alerta leva à ação certa', () => {
    expect(linkDoAlerta(alerta('nota_pendente'))).toBe('/notas/nova?trabalho=t1')
    expect(linkDoAlerta(alerta('parcela_vencida'))).toBe('/recebimentos/novo?trabalho=t1&parcela=r1')
    expect(linkDoAlerta(alerta('recibo_pendente'))).toBe('/trabalhos/t1')
  })
})
