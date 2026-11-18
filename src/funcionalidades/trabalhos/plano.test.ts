import { describe, expect, it } from 'vitest'
import { gerarPlano, reaproveitarIds, renumerar, rotuloParcela, somaPlano, type DadosGerador } from './plano'

const formatura: DadosGerador = {
  totalCentavos: 300000,
  sinalCentavos: 60000,
  vencimentoSinal: '2026-11-18',
  quantidadeParcelas: 8,
  primeiroVencimento: '2026-12-10',
}

describe('gerarPlano', () => {
  it('formatura de R$ 3.000 = sinal de 600 + 8 × 300', () => {
    const plano = gerarPlano(formatura)
    expect(plano).toHaveLength(9)
    expect(plano[0]).toEqual({ numero: 0, valorCentavos: 60000, vencimento: '2026-11-18' })
    expect(plano.slice(1).every((p) => p.valorCentavos === 30000)).toBe(true)
    expect(plano.map((p) => p.vencimento).slice(1, 3)).toEqual(['2026-12-10', '2027-01-10'])
    expect(plano[8]).toMatchObject({ numero: 8, vencimento: '2027-07-10' })
    expect(somaPlano(plano)).toBe(300000)
  })

  it('centavos que sobram vão para a última parcela', () => {
    const plano = gerarPlano({ ...formatura, totalCentavos: 100000, sinalCentavos: 0, quantidadeParcelas: 3 })
    expect(plano.map((p) => p.valorCentavos)).toEqual([33333, 33333, 33334])
    expect(plano.map((p) => p.numero)).toEqual([1, 2, 3])
  })

  it('à vista: só o sinal', () => {
    const plano = gerarPlano({ ...formatura, sinalCentavos: 300000, quantidadeParcelas: 0 })
    expect(plano).toEqual([{ numero: 0, valorCentavos: 300000, vencimento: '2026-11-18' }])
  })

  it.each([
    [{ sinalCentavos: 400000 }, 'O sinal não pode ser maior que o valor total.'],
    [{ quantidadeParcelas: 0 }, 'Sobra valor depois do sinal: informe quantas parcelas.'],
    [{ sinalCentavos: 300000 }, 'O sinal já cobre o valor total: não sobra nada para as parcelas.'],
    [{ totalCentavos: 0 }, 'Informe o valor total do trabalho.'],
    [{ totalCentavos: 60005 }, 'Parcelas demais para esse valor.'],
    [{ primeiroVencimento: '' }, 'Informe o vencimento da primeira parcela.'],
  ])('recusa dados que não fecham (%o)', (ajuste, mensagem) => {
    expect(() => gerarPlano({ ...formatura, ...ajuste })).toThrow(mensagem)
  })
})

describe('edição do plano', () => {
  it('renumera mantendo o sinal como 0', () => {
    const plano = gerarPlano(formatura)
    const semParcela3 = renumerar(plano.filter((p) => p.numero !== 3))
    expect(semParcela3.map((p) => p.numero)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('sem sinal, numera a partir de 1', () => {
    const plano = renumerar([
      { numero: 1, valorCentavos: 100, vencimento: '2026-01-01' },
      { numero: 5, valorCentavos: 100, vencimento: '2026-02-01' },
    ])
    expect(plano.map((p) => p.numero)).toEqual([1, 2])
  })

  it('gerar de novo aproveita os ids pela posição', () => {
    const atual = [
      { id: 'a', numero: 0, valorCentavos: 100, vencimento: '2026-01-01' },
      { id: 'b', numero: 1, valorCentavos: 100, vencimento: '2026-02-01' },
    ]
    const novo = reaproveitarIds(gerarPlano(formatura), atual)
    expect(novo.map((p) => p.id)).toEqual(['a', 'b', undefined, undefined, undefined, undefined, undefined, undefined, undefined])
  })

  it('rótulos', () => {
    expect(rotuloParcela(0, 8)).toBe('Sinal')
    expect(rotuloParcela(3, 8)).toBe('Parcela 3/8')
  })
})
