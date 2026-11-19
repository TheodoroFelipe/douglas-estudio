import { describe, expect, it } from 'vitest'
import { criarEsquemaDespesa, despesaParaBanco, type DadosDespesa } from './esquemas'
import { caminhoComprovante, nomeArquivoComprovante, problemaComprovante } from './rotulos'

const classificacoes: Record<string, 'direta' | 'indireta'> = { album: 'direta', aluguel: 'indireta' }
const esquema = criarEsquemaDespesa({ hoje: '2026-11-19', classificacaoDe: (id) => classificacoes[id] })

const base: DadosDespesa = {
  tipo_despesa_id: 'album',
  trabalho_id: 't1',
  data: '2026-11-19',
  valor: '1.250,00',
  descricao: '  Álbum 30x30 ',
  fornecedor: '',
}

function mensagens(dados: Partial<DadosDespesa>) {
  const resultado = esquema.safeParse({ ...base, ...dados })
  return resultado.success ? {} : Object.fromEntries(resultado.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('esquema da despesa', () => {
  it('aceita despesa direta com trabalho', () => {
    expect(mensagens({})).toEqual({})
  })

  it('despesa direta exige trabalho; indireta não', () => {
    expect(mensagens({ trabalho_id: '' })).toEqual({ trabalho_id: 'Despesa direta precisa de um trabalho.' })
    expect(mensagens({ tipo_despesa_id: 'aluguel', trabalho_id: '' })).toEqual({})
  })

  it('exige tipo, valor positivo e data não futura', () => {
    expect(mensagens({ tipo_despesa_id: '' }).tipo_despesa_id).toBe('Escolha o tipo de despesa.')
    expect(mensagens({ valor: '0,00' }).valor).toBe('Informe o valor, como 150,00.')
    expect(mensagens({ valor: '12,345' }).valor).toBe('Informe o valor, como 150,00.')
    expect(mensagens({ data: '2026-11-20' }).data).toBe('A data não pode ser futura.')
  })
})

describe('despesaParaBanco', () => {
  it('manda o valor como texto e limpa os campos vazios', () => {
    expect(despesaParaBanco(base, 'direta')).toEqual({
      tipo_despesa_id: 'album',
      trabalho_id: 't1',
      data: '2026-11-19',
      valor: '1250.00',
      descricao: 'Álbum 30x30',
      fornecedor: null,
    })
  })

  it('despesa indireta vai sem trabalho, mesmo se um ficou escolhido', () => {
    expect(despesaParaBanco({ ...base, tipo_despesa_id: 'aluguel' }, 'indireta').trabalho_id).toBeNull()
  })
})

describe('comprovante', () => {
  it('caminho pela despesa e pelo tipo do arquivo', () => {
    expect(caminhoComprovante('abc', 'image/jpeg')).toBe('abc/comprovante.jpg')
    expect(caminhoComprovante('abc', 'application/pdf')).toBe('abc/comprovante.pdf')
  })

  it('aceita PDF e foto até 10 MB', () => {
    expect(problemaComprovante({ type: 'image/png', size: 1024 })).toBeNull()
    expect(problemaComprovante({ type: 'image/heic', size: 1024 })).toBe('O comprovante deve ser PDF, JPG, PNG ou WEBP.')
    expect(problemaComprovante({ type: 'application/pdf', size: 11 * 1024 * 1024 })).toBe('O comprovante passa de 10 MB.')
  })

  it('nome do arquivo baixado leva a data', () => {
    expect(nomeArquivoComprovante('abc/comprovante.webp', '2026-11-19')).toBe('comprovante-2026-11-19.webp')
  })
})
