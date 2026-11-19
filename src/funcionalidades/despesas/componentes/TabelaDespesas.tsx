import { Link } from 'react-router'
import { Botao } from '../../../componentes/ui/Botao'
import { Selo } from '../../../componentes/ui/Selo'
import { formatarData } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { useBaixarComprovante, type Despesa } from '../consultas'
import { CLASSIFICACOES, ehClassificacao, nomeArquivoComprovante } from '../rotulos'

type Props = {
  despesas: Despesa[]
  /** Na lista geral mostra o trabalho; no detalhe do trabalho, não precisa. */
  mostrarTrabalho?: boolean
  /** Para onde a edição volta depois de salvar (ex.: o próprio trabalho). */
  voltarPara?: string
}

export function TabelaDespesas({ despesas, mostrarTrabalho = false, voltarPara }: Props) {
  return (
    <div className="relative overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className={`w-full text-sm ${mostrarTrabalho ? 'min-w-[56rem]' : 'min-w-[40rem]'}`}>
        <thead className="bg-stone-50 text-left text-stone-600">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Data</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Tipo</th>
            {mostrarTrabalho && <th scope="col" className="px-4 py-2.5 font-medium">Trabalho</th>}
            <th scope="col" className="px-4 py-2.5 font-medium">Descrição</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Valor</th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {despesas.map((d) => (
            <Linha key={d.id} despesa={d} mostrarTrabalho={mostrarTrabalho} voltarPara={voltarPara} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Linha({ despesa: d, mostrarTrabalho, voltarPara }: { despesa: Despesa; mostrarTrabalho: boolean; voltarPara?: string }) {
  const cancelada = d.status === 'cancelada'
  const classificacao = ehClassificacao(d.tipo?.classificacao) ? CLASSIFICACOES[d.tipo.classificacao] : null
  const linkEditar = `/despesas/${d.id}${voltarPara ? `?voltar=${encodeURIComponent(voltarPara)}` : ''}`

  return (
    <tr className={`align-top ${cancelada ? 'text-stone-400' : ''}`}>
      <td className="whitespace-nowrap px-4 py-3">{formatarData(d.data)}</td>
      <td className="px-4 py-3">
        <p className={cancelada ? '' : 'text-stone-900'}>{d.tipo?.nome}</p>
        {mostrarTrabalho && classificacao && <p className="text-xs text-stone-500">{classificacao.rotulo}</p>}
      </td>
      {mostrarTrabalho && (
        <td className="px-4 py-3">
          {d.trabalho ? (
            <>
              <Link to={`/trabalhos/${d.trabalho.id}`} className="font-medium text-stone-900 underline-offset-4 hover:underline">
                {d.trabalho.descricao}
              </Link>
              <p className="text-stone-500">{d.trabalho.cliente?.nome}</p>
            </>
          ) : (
            <span className="text-stone-500">Estúdio</span>
          )}
        </td>
      )}
      <td className="px-4 py-3">
        {d.descricao && <p className="max-w-64 truncate" title={d.descricao}>{d.descricao}</p>}
        {d.fornecedor && <p className="max-w-64 truncate text-xs text-stone-500" title={d.fornecedor}>{d.fornecedor}</p>}
        {!d.descricao && !d.fornecedor && <span className="text-stone-400">—</span>}
        {cancelada && (
          <p className="mt-1">
            <Selo cor="vermelho">Cancelada</Selo>
          </p>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
        <span className={cancelada ? 'line-through' : 'font-medium text-stone-900'}>{formatarReais(centavosDoBanco(d.valor))}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          {d.comprovante && <BaixarComprovante caminho={d.comprovante} data={d.data} />}
          <Link
            to={linkEditar}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-100"
          >
            {cancelada ? 'Ver' : 'Editar'}
          </Link>
        </div>
      </td>
    </tr>
  )
}

export function BaixarComprovante({ caminho, data }: { caminho: string; data: string }) {
  const baixar = useBaixarComprovante()
  return (
    <div>
      <Botao
        variante="secundario"
        className="px-3! py-1.5!"
        carregando={baixar.isPending}
        onClick={() => baixar.mutate({ caminho, nome: nomeArquivoComprovante(caminho, data) })}
      >
        Comprovante
      </Botao>
      {baixar.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          Não foi possível baixar.
        </p>
      )}
    </div>
  )
}
