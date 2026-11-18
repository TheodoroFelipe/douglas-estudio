import { describe, expect, it } from 'vitest'
import { mensagemErroBanco } from '../../lib/erros'
import { clienteParaBanco, clienteVazio, esquemaCliente } from '../clientes/esquemas'
import { esquemaTrabalho, linhasParaPlano, type DadosTrabalho } from './esquemas'

const linha = (valor: string, extra: Partial<DadosTrabalho['parcelas'][number]> = {}) => ({
  sinal: false,
  valor,
  vencimento: '2026-12-10',
  pagoCentavos: 0,
  ...extra,
})

const trabalho: DadosTrabalho = {
  cliente_id: 'c1',
  tipo: 'formatura',
  descricao: 'Formatura Medicina UNILA 2026',
  data_evento: '',
  hora_evento: '',
  local_evento: '',
  valor_total: '3.000,00',
  numero_contrato: '',
  parcelas: [linha('600,00', { sinal: true }), ...Array.from({ length: 8 }, () => linha('300,00'))],
}

describe('esquemaTrabalho', () => {
  it('aceita o plano que fecha com o total', () => {
    expect(esquemaTrabalho.safeParse(trabalho).success).toBe(true)
  })

  it('recusa soma diferente do total', () => {
    const resultado = esquemaTrabalho.safeParse({ ...trabalho, valor_total: '3.100,00' })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0]).toMatchObject({
      path: ['parcelas'],
      message: 'A soma das parcelas (R$ 3.000,00) precisa ser igual ao valor total (R$ 3.100,00).',
    })
  })

  it('recusa plano vazio', () => {
    const resultado = esquemaTrabalho.safeParse({ ...trabalho, parcelas: [] })
    expect(resultado.error?.issues[0].message).toBe('Gere ou adicione pelo menos uma parcela.')
  })

  it('parcela não fica abaixo do já recebido', () => {
    const parcelas = [linha('500,00', { sinal: true, pagoCentavos: 60000 }), linha('2.500,00')]
    const resultado = esquemaTrabalho.safeParse({ ...trabalho, parcelas })
    expect(resultado.error?.issues[0]).toMatchObject({ path: ['parcelas', 0, 'valor'], message: 'Já foram recebidos R$ 600,00.' })
  })

  it('horário exige data e formato HH:MM', () => {
    expect(esquemaTrabalho.safeParse({ ...trabalho, hora_evento: '19:30' }).error?.issues[0]).toMatchObject({
      path: ['hora_evento'],
      message: 'Informe também a data do evento.',
    })
    expect(esquemaTrabalho.safeParse({ ...trabalho, data_evento: '2026-12-12', hora_evento: '19:30', local_evento: 'Rafain' }).success).toBe(true)
    expect(esquemaTrabalho.safeParse({ ...trabalho, data_evento: '2026-12-12', hora_evento: '25:00' }).success).toBe(false)
  })

  it('numera o plano para o banco: sinal 0, depois 1..N', () => {
    const plano = linhasParaPlano(trabalho.parcelas)
    expect(plano.map((p) => p.numero)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(plano[0].valorCentavos).toBe(60000)
  })
})

describe('esquemaCliente', () => {
  it('valida CPF e e-mail só quando preenchidos', () => {
    expect(esquemaCliente.safeParse({ ...clienteVazio, nome: 'Ana' }).success).toBe(true)
    expect(esquemaCliente.safeParse({ ...clienteVazio, nome: 'Ana', cpf_cnpj: '111.111.111-11' }).success).toBe(false)
    expect(esquemaCliente.safeParse({ ...clienteVazio, nome: 'Ana', email: 'ana@' }).success).toBe(false)
    expect(
      esquemaCliente.safeParse({ ...clienteVazio, nome: 'Comissão', tipo_pessoa: 'PJ', cpf_cnpj: '11.222.333/0001-81' }).success,
    ).toBe(true)
  })

  it('grava só dígitos e troca vazio por nulo', () => {
    expect(clienteParaBanco({ ...clienteVazio, nome: ' Ana ', cpf_cnpj: '529.982.247-25', email: 'Ana@X.com' })).toMatchObject({
      nome: 'Ana',
      cpf_cnpj: '52998224725',
      email: 'ana@x.com',
      telefone: null,
    })
  })
})

describe('mensagemErroBanco', () => {
  it('traduz unicidade e uso', () => {
    const contexto = { unico: { clientes_cpf_cnpj_key: 'CPF já cadastrado.' }, emUso: 'Tem trabalhos.' }
    expect(mensagemErroBanco({ code: '23505', message: 'duplicate key value violates unique constraint "clientes_cpf_cnpj_key"' }, contexto)).toBe(
      'CPF já cadastrado.',
    )
    expect(mensagemErroBanco({ code: '23503', message: 'violates foreign key' }, contexto)).toBe('Tem trabalhos.')
  })

  it('passa as mensagens das nossas regras, com valores em reais', () => {
    expect(
      mensagemErroBanco({ code: '23514', message: 'A parcela 0 já tem 300.00 recebido; o valor não pode ficar menor que isso.' }),
    ).toBe('A parcela 0 já tem R$ 300,00 recebido; o valor não pode ficar menor que isso.')
  })

  it('esconde mensagens técnicas do Postgres', () => {
    expect(mensagemErroBanco({ code: '23514', message: 'new row violates check constraint "x"' })).toBe(
      'Algum dado está fora do formato aceito. Confira os campos.',
    )
    expect(mensagemErroBanco(new Error('Failed to fetch'))).toBe('Não foi possível salvar. Verifique a conexão e tente de novo.')
  })
})
