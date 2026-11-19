import { useState } from 'react'
import { Link } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { Carregando } from '../../../componentes/ui/Carregando'
import { formatarData } from '../../../lib/datas'
import { formatarReais } from '../../../lib/dinheiro'
import { useRankingTrabalhos } from '../consultas'

const PRIMEIROS = 10
const porcentagem = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function RankingTrabalhos({ inicio, fim, rotulo }: { inicio: string; fim: string; rotulo: string }) {
  const { data, isPending, error, isPlaceholderData } = useRankingTrabalhos(inicio, fim)
  const [todos, setTodos] = useState(false)
  const visiveis = todos ? (data ?? []) : (data ?? []).slice(0, PRIMEIROS)

  return (
    <section aria-labelledby="titulo-ranking">
      <h2 id="titulo-ranking" className="text-base font-semibold text-stone-900">
        Resultado dos trabalhos concluídos
      </h2>
      <p className="mb-3 text-sm text-stone-500">
        Concluídos em {rotulo}, do maior para o menor resultado (recebido menos despesas diretas e taxas de cartão).
      </p>
      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar o resultado dos trabalhos.</Alerta>
      ) : data.length === 0 ? (
        <Alerta>Nenhum trabalho concluído no período.</Alerta>
      ) : (
        <div className={`transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          <div className="relative overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-stone-50 text-left text-stone-600">
                <tr>
                  <th scope="col" className="w-10 px-4 py-2.5 font-medium">
                    <span className="sr-only">Posição</span>
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Trabalho</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Concluído em</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Recebido</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Despesas</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Resultado</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visiveis.map((t, i) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2.5 tabular-nums text-stone-500">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <Link to={`/trabalhos/${t.id}`} className="font-medium text-stone-900 underline-offset-4 hover:underline">
                        {t.descricao}
                      </Link>
                      <p className="text-stone-500">{t.cliente}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-700">{formatarData(t.dataConclusao)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatarReais(t.recebido)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-stone-600">{formatarReais(t.despesas)}</td>
                    <td className={`whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums ${t.resultado < 0 ? 'text-red-700' : 'text-stone-900'}`}>
                      {formatarReais(t.resultado)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-stone-600">
                      {t.margem === null ? '—' : `${porcentagem.format(t.margem)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length > PRIMEIROS && (
            <Botao variante="link" className="mt-2" onClick={() => setTodos((v) => !v)}>
              {todos ? `Mostrar só os ${PRIMEIROS} primeiros` : `Ver todos os ${data.length}`}
            </Botao>
          )}
        </div>
      )}
    </section>
  )
}
