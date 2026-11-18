import { describe, expect, it } from 'vitest'
import { chaveValida, decodificarChave, formatarChave } from './chave'
import { lerDanfse, pareceDanfse } from './danfse'
import { criarEsquemaNota, notaParaBanco, type DadosNota } from './esquemas'

// Dados fictícios (CNPJ e CPF de teste), na ordem em que o pdf.js entrega o
// texto do DANFSe v2.0 do Emissor Nacional.
const CHAVE = '41083042211444777000161000000000004526111234567890'
const linhasDanfse = [
  'DATA CIENTIFICAÇÃO:', 'IDENTIFICAÇÃO E ASSINATURA', 'N° NFS-e / CHAVE NFS-e', `45 / ${CHAVE}`,
  'DANFSe v2.0', 'Documento Auxiliar da NFS-e', 'Município: Foz do Iguaçu - PR', 'Ambiente Gerador: 2', 'Tipo de Ambiente: 1',
  'CHAVE DE ACESSO DA NFS-e', CHAVE,
  'NÚMERO DA NFS-e', '45', 'COMPETÊNCIA DA NFS-e', '10/11/2026',
  'DATA E HORA DA EMISSÃO DA NFS-e', '16/11/2026 14:59:39', 'NÚMERO DA DPS', '13',
  'SITUAÇÃO DA NFS-e', 'NFS-e Gerada',
  'PRESTADOR / FORNECEDOR', 'CNPJ / CPF / NIF', '11.444.777/0001-61', 'Indicador Municipal (Inscrição)', '-',
  'Nome / Nome Empresarial', 'ESTUDIO TESTE LTDA',
  'TOMADOR / ADQUIRENTE', 'CNPJ / CPF / NIF', '529.982.247-25', 'Indicador Municipal (Inscrição)', '-',
  'Nome / Nome Empresarial', 'CLIENTE DE TESTE',
  'SERVIÇO PRESTADO', 'Código de Tributação Nacional/Municipal', '13.03.01 / -',
  'Descrição do Serviço', 'Serviço de fotografia de formatura.',
  'TRIBUTAÇÃO MUNICIPAL (ISSQN)', 'BC ISSQN', '-', 'Alíquota Aplicada', '-',
  'VALOR TOTAL DA NFS-e', 'VALOR DA OPERAÇÃO / SERVIÇO', 'R$ 3.000,00', 'VALOR LÍQUIDO DA NFS-e', 'R$ 3.000,00',
]

describe('chave de acesso', () => {
  it('confere o dígito verificador', () => {
    expect(chaveValida(CHAVE)).toBe(true)
    expect(chaveValida(CHAVE.slice(0, 49) + '1')).toBe(false)
    expect(chaveValida(CHAVE.slice(1))).toBe(false)
    expect(chaveValida(formatarChave(CHAVE))).toBe(true)
  })

  it('tira da chave o CNPJ, o número e o mês de emissão', () => {
    expect(decodificarChave(CHAVE)).toEqual({
      municipio: '4108304',
      inscricao: '11444777000161',
      numero: '45',
      mesEmissao: '2026-11',
    })
    expect(decodificarChave('123')).toBeNull()
  })

  it('formata em blocos de 5', () => {
    expect(formatarChave(CHAVE)).toBe('41083 04221 14447 77000 16100 00000 00004 52611 12345 67890')
  })
})

describe('lerDanfse', () => {
  it('lê os campos da nota', () => {
    expect(pareceDanfse(linhasDanfse)).toBe(true)
    expect(lerDanfse(linhasDanfse)).toEqual({
      numero: '45',
      chave: CHAVE,
      dataEmissao: '2026-11-16',
      dataCompetencia: '2026-11-10',
      valorCentavos: 300000,
      codigoServico: '13.03.01',
      descricaoServico: 'Serviço de fotografia de formatura.',
      aliquotaCentesimos: null,
      prestadorDocumento: '11444777000161',
      tomadorDocumento: '52998224725',
      tomadorNome: 'CLIENTE DE TESTE',
      situacao: 'NFS-e Gerada',
      tipoAmbiente: '1',
    })
  })

  it('alíquota preenchida e campos ausentes', () => {
    const comAliquota = linhasDanfse.map((s, i, l) => (l[i - 1] === 'Alíquota Aplicada' ? '2,00%' : s))
    expect(lerDanfse(comAliquota).aliquotaCentesimos).toBe(200)
    expect(lerDanfse(['qualquer', 'texto'])).toMatchObject({ numero: null, chave: null, valorCentavos: null })
    expect(pareceDanfse(['qualquer', 'texto'])).toBe(false)
  })
})

describe('esquema da nota', () => {
  const esquema = criarEsquemaNota({ hoje: '2026-11-18', cnpjEstudio: '11444777000161' })
  const base: DadosNota = {
    numero: '45',
    chave_acesso: formatarChave(CHAVE),
    data_emissao: '2026-11-16',
    data_competencia: '2026-11-10',
    valor_servico: '3.000,00',
    codigo_servico: '13.03.01',
    descricao_servico: 'Serviços de fotografia',
    aliquota_iss: '',
  }
  const mensagem = (dados: Partial<DadosNota>, e = esquema) => e.safeParse({ ...base, ...dados }).error?.issues[0]?.message

  it('aceita a nota lida do PDF', () => {
    expect(esquema.safeParse(base).success).toBe(true)
  })

  it('confere a chave com o número e o CNPJ do estúdio', () => {
    expect(mensagem({ numero: '46' })).toBe('A chave de acesso é da nota 45.')
    expect(mensagem({ chave_acesso: CHAVE.slice(0, 49) + '1' })).toBe('Chave inválida: confira os 50 dígitos.')
    const outroEstudio = criarEsquemaNota({ hoje: '2026-11-18', cnpjEstudio: '11222333000181' })
    expect(mensagem({}, outroEstudio)).toBe('Esta chave é de uma nota de outro CNPJ, não do estúdio.')
    expect(criarEsquemaNota({ hoje: '2026-11-18', cnpjEstudio: null }).safeParse(base).success).toBe(true)
  })

  it('data futura, valor e alíquota', () => {
    expect(mensagem({ data_emissao: '2026-11-19' })).toBe('A data de emissão não pode ser futura.')
    expect(mensagem({ valor_servico: '0' })).toBe('Informe o valor da nota.')
    expect(mensagem({ aliquota_iss: '120' })).toBe('Informe a alíquota entre 0 e 100, ou deixe em branco.')
  })

  it('vai para o banco com chave só em dígitos e dinheiro em texto', () => {
    expect(notaParaBanco('t1', { ...base, aliquota_iss: '2,5' }, 'n0')).toMatchObject({
      trabalho_id: 't1',
      chave_acesso: CHAVE,
      valor_servico: '3000.00',
      aliquota_iss: '2.50',
      nota_substituida_id: 'n0',
    })
    expect(notaParaBanco('t1', base, null).aliquota_iss).toBeNull()
  })
})
