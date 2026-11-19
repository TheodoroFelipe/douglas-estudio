import { useMemo, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../../auth/useAuth'
import { Alerta } from '../../../componentes/ui/Alerta'
import { CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selecao } from '../../../componentes/ui/Selecao'
import { Selo } from '../../../componentes/ui/Selo'
import { formatarData, hojeISO } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { rotuloParcela } from '../../trabalhos/plano'
import { infoStatusParcela } from '../../trabalhos/rotulos'
import { agruparAlertas, linkDoAlerta } from '../alertas'
import { GraficoMensal } from '../componentes/GraficoMensal'
import { DespesasPorCategoria } from '../componentes/DespesasPorCategoria'
import { RankingTrabalhos } from '../componentes/RankingTrabalhos'
import { somarMeses, useAlertas, usePainelPeriodo, useParcelasEmAberto, useTotalEmAberto, useTotalVencido } from '../consultas'
import { resolverPeriodo, TIPOS_PERIODO, type TipoPeriodo } from '../periodo'

// Cores fixas por entidade (paleta validada para daltonismo; ver o skill de dataviz):
// recebido sempre azul, despesas laranja, resultado verde-água, faturado mostarda.
const COR = { recebido: '#2a78d6', despesas: '#eb6834', resultado: '#1baf7a', faturado: '#eda100' }

export function PaginaPainel() {
  const { perfil } = useAuth()
  const [parametros, setParametros] = useSearchParams()
  const hoje = hojeISO()
  const periodo = resolverPeriodo(parametros, hoje)

  // Uma consulta cobre o gráfico (que, no modo mês, mostra 6 meses) e os totais.
  const painel = usePainelPeriodo(periodo.graficoInicio, periodo.graficoFim)
  const vencido = useTotalVencido()
  const emAberto = useTotalEmAberto()

  const linhasPeriodo = useMemo(
    () => (painel.data ?? []).filter((l) => l.mes >= periodo.inicio && l.mes <= periodo.fim),
    [painel.data, periodo.inicio, periodo.fim],
  )
  const total = somarMeses(linhasPeriodo)
  const despesas = total.despesasDiretas + total.despesasIndiretas

  function definir(novos: Record<string, string>) {
    setParametros(novos, { replace: true })
  }

  const meses = painel.data?.map((l) => l.mes) ?? []
  const valores = (chave: 'recebido' | 'faturado' | 'resultado') => painel.data?.map((l) => l[chave]) ?? []
  const despesasPorMes = painel.data?.map((l) => l.despesasDiretas + l.despesasIndiretas) ?? []

  return (
    <>
      <CabecalhoPagina titulo="Painel" subtitulo={`Olá, ${perfil?.nome}. Números de ${periodo.rotulo}.`} />

      {/* Filtro de período: uma linha só, acima de tudo o que ele filtra. */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Selecao
          rotulo="Período"
          value={periodo.tipo}
          className="w-52"
          onChange={(e) => {
            const tipo = e.target.value as TipoPeriodo
            if (tipo === 'mes') definir({})
            else if (tipo === 'personalizado') definir({ periodo: tipo, de: periodo.inicio, ate: periodo.fim })
            else definir({ periodo: tipo })
          }}
        >
          {Object.entries(TIPOS_PERIODO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Selecao>
        {periodo.tipo === 'mes' && (
          <Campo rotulo="Mês" type="month" value={periodo.inicio} onChange={(e) => e.target.value && definir({ mes: e.target.value })} />
        )}
        {periodo.tipo === 'personalizado' && (
          <>
            <Campo rotulo="De" type="month" value={periodo.inicio} onChange={(e) => e.target.value && definir({ periodo: 'personalizado', de: e.target.value, ate: periodo.fim })} />
            <Campo rotulo="Até" type="month" value={periodo.fim} onChange={(e) => e.target.value && definir({ periodo: 'personalizado', de: periodo.inicio, ate: e.target.value })} />
          </>
        )}
      </div>

      {painel.isPending ? (
        <Carregando />
      ) : painel.error ? (
        <Alerta tipo="erro">Não foi possível carregar o painel.</Alerta>
      ) : (
        <div className={`space-y-8 transition-opacity ${painel.isPlaceholderData ? 'opacity-60' : ''}`}>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Cartao rotulo="Recebido" valor={formatarReais(total.recebido)} cor={COR.recebido}>
              {total.taxas > 0 ? `Líquido ${formatarReais(total.recebido - total.taxas)} (taxas ${formatarReais(total.taxas)})` : 'Sem taxas de cartão'}
            </Cartao>
            <Cartao rotulo="A receber no período" valor={formatarReais(total.aReceber)}>
              Parcelas com vencimento em {periodo.rotulo} ({formatarReais(total.previsto)} previstos)
            </Cartao>
            <Cartao rotulo="Total em aberto" valor={emAberto.data === undefined ? '…' : formatarReais(emAberto.data)}>
              Falta receber de todos os trabalhos, vencido ou não
            </Cartao>
            <Cartao
              rotulo="Vencido até hoje"
              valor={vencido.data === undefined ? '…' : formatarReais(vencido.data)}
              alerta={(vencido.data ?? 0) > 0}
            >
              {(vencido.data ?? 0) > 0 ? 'Parcelas de qualquer mês, já vencidas e não pagas' : 'Nenhuma parcela vencida'}
            </Cartao>
            <Cartao rotulo="Faturado em nota" valor={formatarReais(total.faturado)} cor={COR.faturado}>
              Notas emitidas com competência no período
            </Cartao>
            <Cartao rotulo="Despesas" valor={formatarReais(despesas)} cor={COR.despesas}>
              Diretas {formatarReais(total.despesasDiretas)} · indiretas {formatarReais(total.despesasIndiretas)}
            </Cartao>
            <Cartao rotulo="Resultado" valor={formatarReais(total.resultado)} cor={COR.resultado} className="xl:col-span-2">
              Recebido menos despesas
            </Cartao>
          </dl>

          <div className="grid gap-4 xl:grid-cols-2">
            <GraficoMensal
              titulo="Receitas, despesas e resultado"
              descricao={periodo.destaque ? 'Os 6 meses até o mês escolhido, em destaque.' : 'Por mês, no período.'}
              meses={meses}
              destaque={periodo.destaque}
              atualizando={painel.isPlaceholderData}
              barras={[
                { rotulo: 'Recebido', cor: COR.recebido, valores: valores('recebido') },
                { rotulo: 'Despesas', cor: COR.despesas, valores: despesasPorMes },
              ]}
              linha={{ rotulo: 'Resultado', cor: COR.resultado, valores: valores('resultado') }}
            />
            <GraficoMensal
              titulo="Recebido × faturado em nota"
              descricao="O que entrou e o que foi faturado (pela competência da nota)."
              meses={meses}
              destaque={periodo.destaque}
              atualizando={painel.isPlaceholderData}
              barras={[
                { rotulo: 'Recebido', cor: COR.recebido, valores: valores('recebido') },
                { rotulo: 'Faturado em nota', cor: COR.faturado, valores: valores('faturado') },
              ]}
            />
          </div>

          <RankingTrabalhos inicio={periodo.inicio} fim={periodo.fim} rotulo={periodo.rotulo} />
          <div className="max-w-3xl">
            <DespesasPorCategoria inicio={periodo.inicio} fim={periodo.fim} rotulo={periodo.rotulo} cor={COR.despesas} />
          </div>

          <Alertas />
          <ParcelasEmAberto inicio={periodo.inicio} fim={periodo.fim} rotulo={periodo.rotulo} hoje={hoje} />
        </div>
      )}
    </>
  )
}

type PropsCartao = { rotulo: string; valor: string; cor?: string; alerta?: boolean; className?: string; children: ReactNode }

function Cartao({ rotulo, valor, cor, alerta, className = '', children }: PropsCartao) {
  return (
    <div className={`rounded-xl border bg-white px-4 py-3 ${alerta ? 'border-red-200' : 'border-stone-200'} ${className}`}>
      <dt className="flex items-center gap-1.5 text-sm text-stone-600">
        {cor && <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: cor }} />}
        {rotulo}
      </dt>
      <dd className={`mt-1 text-2xl font-semibold ${alerta ? 'text-red-700' : 'text-stone-900'}`}>{valor}</dd>
      <dd className="mt-0.5 text-xs text-stone-500">{children}</dd>
    </div>
  )
}

function Alertas() {
  const { data, isPending, error } = useAlertas()
  const grupos = useMemo(() => agruparAlertas(data ?? []), [data])

  return (
    <section aria-labelledby="titulo-alertas">
      <h2 id="titulo-alertas" className="mb-3 text-base font-semibold text-stone-900">
        Alertas
      </h2>
      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar os alertas.</Alerta>
      ) : grupos.length === 0 ? (
        <Alerta tipo="sucesso">Tudo em dia: nenhuma pendência de nota, recibo ou parcela.</Alerta>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grupos.map((g) => (
            <div key={g.tipo} className="rounded-xl border border-stone-200 bg-white">
              <h3 className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-900">
                {g.titulo}
                <Selo cor={g.tipo === 'nota_pendente' || g.tipo === 'parcela_vencida' ? 'vermelho' : 'amarelo'}>{g.itens.length}</Selo>
              </h3>
              <ul className="divide-y divide-stone-100">
                {g.itens.slice(0, 8).map((a) => (
                  <li key={`${a.tipo}-${a.trabalho_id}-${a.referencia_id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <Link to={`/trabalhos/${a.trabalho_id}`} className="block truncate font-medium text-stone-900 underline-offset-4 hover:underline">
                        {a.trabalho_descricao}
                      </Link>
                      <p className="text-stone-500">
                        {a.descricao}
                        {a.data_referencia && ` · ${formatarData(a.data_referencia)}`}
                      </p>
                    </div>
                    <Link to={linkDoAlerta(a)} className="shrink-0 font-medium text-stone-700 underline underline-offset-4 hover:text-stone-900">
                      {g.acao}
                    </Link>
                  </li>
                ))}
              </ul>
              {g.itens.length > 8 && <p className="px-4 py-2 text-xs text-stone-500">E mais {g.itens.length - 8}.</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ParcelasEmAberto({ inicio, fim, rotulo, hoje }: { inicio: string; fim: string; rotulo: string; hoje: string }) {
  const { data, isPending, error } = useParcelasEmAberto(inicio, fim)

  return (
    <section aria-labelledby="titulo-parcelas-abertas">
      <h2 id="titulo-parcelas-abertas" className="mb-3 text-base font-semibold text-stone-900">
        Parcelas em aberto em {rotulo}
      </h2>
      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar as parcelas.</Alerta>
      ) : data.length === 0 ? (
        <Alerta>Nenhuma parcela em aberto vencendo no período.</Alerta>
      ) : (
        <div className="relative overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Vencimento</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Trabalho</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Parcela</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Saldo</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <span className="sr-only">Receber</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.map((p) => {
                const info = infoStatusParcela(p.status)
                return (
                  <tr key={p.id}>
                    <td className={`whitespace-nowrap px-4 py-2.5 ${p.vencimento! < hoje ? 'font-medium text-red-700' : 'text-stone-700'}`}>
                      {formatarData(p.vencimento)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link to={`/trabalhos/${p.trabalho_id}`} className="font-medium text-stone-900 underline-offset-4 hover:underline">
                        {p.trabalho.descricao}
                      </Link>
                      <p className="text-stone-500">{p.trabalho.cliente_nome}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-700">{rotuloParcela(p.numero ?? 0, p.total_parcelas ?? 0)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatarReais(centavosDoBanco(p.saldo))}</td>
                    <td className="px-4 py-2.5">
                      <Selo cor={info.cor}>{info.rotulo}</Selo>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        to={`/recebimentos/novo?trabalho=${p.trabalho_id}&parcela=${p.id}`}
                        className="font-medium text-stone-700 underline underline-offset-4 hover:text-stone-900"
                      >
                        Receber
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
