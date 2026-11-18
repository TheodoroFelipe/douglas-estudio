import { describe, expect, it } from 'vitest'
import { diaCurto, eventosPorDia, gradeDoMes, horaCurta } from './calendario'

describe('gradeDoMes', () => {
  it('semanas de segunda a domingo cobrindo o mês', () => {
    // Dezembro de 2026 começa numa terça e termina numa quinta.
    const grade = gradeDoMes('2026-12')
    expect(grade).toHaveLength(5)
    expect(grade[0][0]).toEqual({ data: '2026-11-30', dia: 30, doMes: false })
    expect(grade[0][1]).toEqual({ data: '2026-12-01', dia: 1, doMes: true })
    expect(grade[4][6]).toEqual({ data: '2027-01-03', dia: 3, doMes: false })
    expect(grade.flat().filter((d) => d.doMes)).toHaveLength(31)
  })

  it('fevereiro bissexto e virada de ano para trás', () => {
    expect(gradeDoMes('2028-02').flat().filter((d) => d.doMes)).toHaveLength(29)
    // Janeiro de 2027 começa numa sexta: a grade traz 28 a 31 de dezembro.
    expect(gradeDoMes('2027-01')[0].slice(0, 4).map((d) => d.data)).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
    ])
  })

  it('mês que começa na segunda não traz dias do mês anterior', () => {
    expect(gradeDoMes('2027-02')[0][0]).toEqual({ data: '2027-02-01', dia: 1, doMes: true })
  })
})

describe('eventosPorDia', () => {
  const evento = (id: string, data: string | null, hora: string | null, descricao = id) => ({
    id, descricao, data_evento: data, hora_evento: hora, status: 'em_andamento',
  })

  it('agrupa por data e ordena: com horário primeiro, depois por nome', () => {
    const mapa = eventosPorDia([
      evento('b', '2026-12-12', null, 'Ensaio'),
      evento('c', '2026-12-12', '19:30:00'),
      evento('a', '2026-12-12', '10:00:00'),
      evento('d', '2026-12-12', null, 'Casamento'),
      evento('sem-data', null, null),
    ])
    expect(mapa.get('2026-12-12')!.map((e) => e.id)).toEqual(['a', 'c', 'd', 'b'])
    expect(mapa.size).toBe(1)
  })

  it('rótulos curtos', () => {
    expect(diaCurto('2026-12-12')).toBe('sáb, 12/12')
    expect(horaCurta('19:30:00')).toBe('19:30')
    expect(horaCurta(null)).toBe('')
  })
})
