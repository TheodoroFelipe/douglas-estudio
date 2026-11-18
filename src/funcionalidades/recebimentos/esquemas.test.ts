import { describe, expect, it } from 'vitest'
import { configuracoesParaBanco, esquemaConfiguracoes, pendenciasRecibo, type Configuracoes } from '../configuracoes/esquemas'
import { criarEsquemaRecebimento, recebimentoParaBanco, type DadosRecebimento } from './esquemas'

const esquema = criarEsquemaRecebimento({
  hoje: '2026-11-18',
  saldoTrabalho: 300000,
  saldoParcela: (id) => ({ sinal: 60000, p1: 30000 })[id],
})

const base: DadosRecebimento = {
  parcela_id: 'sinal',
  data_recebimento: '2026-11-18',
  valor: '600,00',
  forma_pagamento: 'pix',
  taxa: '',
  observacoes: '',
}

const mensagem = (dados: Partial<DadosRecebimento>) => esquema.safeParse({ ...base, ...dados }).error?.issues[0]?.message

describe('esquema do recebimento', () => {
  it('aceita o sinal inteiro', () => {
    expect(esquema.safeParse(base).success).toBe(true)
  })

  it('não passa do saldo da parcela', () => {
    expect(mensagem({ valor: '600,01' })).toBe('O saldo desta parcela é R$ 600,00.')
  })

  it('sem parcela, não passa do que falta no trabalho', () => {
    expect(esquema.safeParse({ ...base, parcela_id: '', valor: '3.000,00' }).success).toBe(true)
    expect(mensagem({ parcela_id: '', valor: '3.000,01' })).toMatch(/^Faltam R\$ 3\.000,00 para fechar/)
  })

  it('exige valor, forma e data que não seja futura', () => {
    expect(mensagem({ valor: '0' })).toBe('Informe o valor recebido.')
    expect(mensagem({ valor: 'abc' })).toBe('Informe o valor recebido.')
    expect(mensagem({ forma_pagamento: '' })).toBe('Escolha a forma de pagamento.')
    expect(mensagem({ data_recebimento: '2026-11-19' })).toBe('A data não pode ser futura.')
  })

  it('taxa só no cartão, e não maior que o valor', () => {
    expect(mensagem({ forma_pagamento: 'cartao_credito', taxa: '700,00' })).toBe('A taxa não pode passar do valor recebido.')
    expect(mensagem({ forma_pagamento: 'cartao_credito', taxa: '9,x' })).toBe('Informe a taxa em reais, como 9,00.')
    expect(mensagem({ forma_pagamento: 'pix', taxa: '9,x' })).toBeUndefined()
  })

  it('vai para o banco com dinheiro em texto e taxa zerada fora do cartão', () => {
    expect(recebimentoParaBanco('t1', { ...base, taxa: '5,00', observacoes: ' ' })).toEqual({
      trabalho_id: 't1',
      parcela_id: 'sinal',
      data_recebimento: '2026-11-18',
      valor: '600.00',
      forma_pagamento: 'pix',
      taxa: '0.00',
      observacoes: null,
    })
    expect(recebimentoParaBanco('t1', { ...base, parcela_id: '', forma_pagamento: 'cartao_debito', taxa: '12,34' })).toMatchObject({
      parcela_id: null,
      taxa: '12.34',
    })
  })
})

describe('configurações', () => {
  const formulario = {
    nome_fantasia: 'Douglas Guimarães Fotografia',
    razao_social: 'Douglas LTDA',
    cnpj: '11.444.777/0001-61',
    inscricao_municipal: '',
    endereco: 'Rua A, 1',
    cidade: 'Foz do Iguaçu',
    uf: 'pr',
    telefone: '',
    email: '',
    responsavel_assinatura: 'Douglas',
    codigo_servico_padrao: '13.03.01',
    descricao_servico_padrao: 'Serviços de fotografia',
    aliquota_iss_padrao: '2,5',
  }

  it('valida CNPJ, UF e alíquota', () => {
    expect(esquemaConfiguracoes.safeParse(formulario).success).toBe(true)
    expect(esquemaConfiguracoes.safeParse({ ...formulario, cnpj: '11.444.777/0001-62' }).success).toBe(false)
    expect(esquemaConfiguracoes.safeParse({ ...formulario, uf: 'P' }).success).toBe(false)
    expect(esquemaConfiguracoes.safeParse({ ...formulario, aliquota_iss_padrao: '100,01' }).success).toBe(false)
  })

  it('grava CNPJ só com dígitos, UF maiúscula e alíquota em texto', () => {
    expect(configuracoesParaBanco(formulario)).toMatchObject({
      cnpj: '11444777000161',
      uf: 'PR',
      aliquota_iss_padrao: '2.50',
      inscricao_municipal: null,
    })
  })

  it('lista o que falta para emitir recibo', () => {
    const vazia = { razao_social: null, cnpj: null, endereco: ' ', responsavel_assinatura: null, logo_path: null } as Configuracoes
    expect(pendenciasRecibo(vazia)).toEqual(['razão social', 'CNPJ', 'endereço', 'responsável pela assinatura', 'logo'])
  })
})
