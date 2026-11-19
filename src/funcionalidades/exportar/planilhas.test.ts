import { describe, expect, it } from 'vitest'
import { somarCategorias } from '../painel/categorias'
import { csvDespesas, csvNotas, csvRecebimentos, nomeArquivoPlanilha } from './planilhas'

/** Linhas do CSV sem o BOM e sem a linha vazia do fim. */
function linhas(csv: string): string[] {
  expect(csv.startsWith('﻿')).toBe(true)
  return csv.slice(1).split('\r\n').filter(Boolean)
}

describe('planilha de recebimentos', () => {
  it('uma linha por recebimento, com líquido, recibo e status', () => {
    const csv = csvRecebimentos([
      {
        data: '2026-11-05', cliente: 'Ana Souza', documento: '52998224725', trabalho: 'Formatura Medicina',
        parcelaNumero: 2, totalParcelas: 8, forma: 'cartao_credito', valor: 100000, taxa: 3500,
        recibo: { ano: 2026, numero: 7 }, status: 'confirmado',
      },
      {
        data: '2026-11-06', cliente: 'Ana Souza', documento: null, trabalho: 'Ensaio', parcelaNumero: null,
        totalParcelas: 0, forma: 'pix', valor: 30000, taxa: 0, recibo: null, status: 'estornado',
      },
    ])
    expect(linhas(csv)).toEqual([
      'Data;Cliente;CPF/CNPJ;Trabalho;Referência;Forma de pagamento;Valor;Taxa;Líquido;Recibo;Status',
      '05/11/2026;Ana Souza;529.982.247-25;Formatura Medicina;Parcela 2/8;Cartão de crédito;1000,00;35,00;965,00;"=""2026/0007""";Confirmado',
      '06/11/2026;Ana Souza;;Ensaio;Sem parcela;Pix;300,00;0,00;300,00;;Estornado',
    ])
  })
})

describe('planilha de notas', () => {
  it('chave e código do serviço como texto fixo; cancelada com motivo', () => {
    const chave = '41083042211444777000161000000000004526111234567890'
    const csv = csvNotas([
      {
        numero: '45', chave, emissao: '2026-11-10', competencia: '2026-11-10', cliente: 'Comissão UNILA',
        documento: '11444777000161', trabalho: 'Formatura', valor: 300000, codigoServico: '13.03.01',
        status: 'cancelada', motivoCancelamento: 'Valor errado; refeita',
      },
    ])
    expect(linhas(csv)[1]).toBe(
      `45;"=""${chave}""";10/11/2026;10/11/2026;Comissão UNILA;11.444.777/0001-61;Formatura;3000,00;"=""13.03.01""";Cancelada;"Valor errado; refeita"`,
    )
  })
})

describe('planilha de despesas', () => {
  it('indireta aparece como do estúdio', () => {
    const csv = csvDespesas([
      {
        data: '2026-11-01', tipo: 'Aluguel', classificacao: 'indireta', trabalho: null, cliente: null, fornecedor: null,
        descricao: null, valor: 120000, temComprovante: true, status: 'ativa', motivoCancelamento: null,
      },
      {
        data: '2026-11-02', tipo: 'Impressão e álbum', classificacao: 'direta', trabalho: 'Formatura', cliente: 'Ana',
        fornecedor: 'Gráfica', descricao: 'Álbum "luxo"', valor: 45000, temComprovante: false, status: 'cancelada',
        motivoCancelamento: 'Duplicada',
      },
    ])
    expect(linhas(csv).slice(1)).toEqual([
      '01/11/2026;Aluguel;Indireta;Estúdio;;;;1200,00;Sim;Ativa;',
      '02/11/2026;Impressão e álbum;Direta;Formatura;Ana;Gráfica;"Álbum ""luxo""";450,00;Não;Cancelada;Duplicada',
    ])
  })

  it('nome do arquivo leva o mês', () => {
    expect(nomeArquivoPlanilha('notas', '2026-11')).toBe('notas-fiscais-2026-11.csv')
    expect(nomeArquivoPlanilha('despesas', '2026-11')).toBe('despesas-2026-11.csv')
  })
})

describe('despesas por categoria (painel)', () => {
  it('soma os meses de cada tipo, junta as taxas e ordena do maior para o menor', () => {
    expect(
      somarCategorias([
        { tipo_despesa_id: 'a', tipo_nome: 'Álbum', classificacao: 'direta', total: 100 },
        { tipo_despesa_id: 'b', tipo_nome: 'Aluguel', classificacao: 'indireta', total: 1200 },
        { tipo_despesa_id: 'a', tipo_nome: 'Álbum', classificacao: 'direta', total: 250.5 },
        { tipo_despesa_id: null, tipo_nome: 'Taxas de recebimento', classificacao: 'direta', total: 35 },
        { tipo_despesa_id: null, tipo_nome: 'Taxas de recebimento', classificacao: 'direta', total: 10 },
      ]),
    ).toEqual([
      { chave: 'b', nome: 'Aluguel', classificacao: 'indireta', total: 120000 },
      { chave: 'a', nome: 'Álbum', classificacao: 'direta', total: 35050 },
      { chave: 'taxas', nome: 'Taxas de cartão', classificacao: 'direta', total: 4500 },
    ])
  })
})
