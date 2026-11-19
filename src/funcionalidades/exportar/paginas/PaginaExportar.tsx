import { useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { formatarMes, hojeISO } from '../../../lib/datas'
import { useExportar } from '../consultas'
import { nomeArquivoPlanilha, type Planilha } from '../planilhas'

const PLANILHAS: { chave: Planilha; titulo: string; descricao: string }[] = [
  {
    chave: 'recebimentos',
    titulo: 'Recebimentos',
    descricao: 'Pela data do pagamento: cliente, CPF/CNPJ, forma, valor, taxa do cartão, líquido e número do recibo.',
  },
  {
    chave: 'notas',
    titulo: 'Notas fiscais',
    descricao: 'Pela competência: número, chave de acesso, emissão, cliente, valor e código do serviço.',
  },
  {
    chave: 'despesas',
    titulo: 'Despesas',
    descricao: 'Pela data do pagamento: tipo, direta ou indireta, trabalho, fornecedor e valor. As taxas de cartão estão na planilha de recebimentos.',
  },
]

export function PaginaExportar() {
  const [parametros, setParametros] = useSearchParams()
  const mes = parametros.get('mes') || hojeISO().slice(0, 7)
  const exportar = useExportar()
  const baixando = exportar.isPending ? exportar.variables?.planilhas : undefined

  function baixar(planilhas: Planilha[]) {
    exportar.mutate({ planilhas, mes })
  }

  const contagem = exportar.isSuccess && exportar.variables?.mes === mes ? exportar.data : null

  return (
    <>
      <CabecalhoPagina
        titulo="Exportar para o contador"
        subtitulo="Planilhas CSV do mês, prontas para abrir no Excel. Lançamentos cancelados e estornados também entram, com o status."
      />
      <div className="max-w-3xl space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <Campo
            rotulo="Mês"
            type="month"
            value={mes}
            className="w-52"
            onChange={(e) => {
              if (e.target.value) setParametros({ mes: e.target.value }, { replace: true })
              exportar.reset()
            }}
          />
          <Botao carregando={baixando?.length === PLANILHAS.length} disabled={exportar.isPending} onClick={() => baixar(PLANILHAS.map((p) => p.chave))}>
            Baixar as três
          </Botao>
        </div>

        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {PLANILHAS.map((p) => (
            <li key={p.chave} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-900">{p.titulo}</p>
                <p className="text-sm text-stone-600">{p.descricao}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {nomeArquivoPlanilha(p.chave, mes)}
                  {contagem?.[p.chave] !== undefined &&
                    ` · baixado, ${contagem[p.chave] === 1 ? '1 linha' : `${contagem[p.chave]} linhas`}`}
                </p>
              </div>
              <Botao
                variante="secundario"
                carregando={baixando?.length === 1 && baixando[0] === p.chave}
                disabled={exportar.isPending}
                onClick={() => baixar([p.chave])}
              >
                Baixar
              </Botao>
            </li>
          ))}
        </ul>

        {exportar.error && <Alerta tipo="erro">Não foi possível gerar a planilha. Verifique a conexão e tente de novo.</Alerta>}

        <p className="text-sm text-stone-500">
          Arquivos de {formatarMes(mes)}: separador ponto e vírgula, valores com vírgula decimal e datas em dd/mm/aaaa. Os documentos
          dos clientes (CPF/CNPJ) vão nas planilhas: envie só para o contador.
        </p>
      </div>
    </>
  )
}
