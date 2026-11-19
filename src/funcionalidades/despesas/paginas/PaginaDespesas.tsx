import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selecao } from '../../../componentes/ui/Selecao'
import { formatarMes, hojeISO } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { useRecebimentosDoMes } from '../../recebimentos/consultas'
import { TabelaDespesas } from '../componentes/TabelaDespesas'
import { useDespesasDoMes, useTiposDespesa } from '../consultas'
import { CLASSIFICACOES, ehClassificacao, type Classificacao } from '../rotulos'

export function PaginaDespesas() {
  const [parametros, setParametros] = useSearchParams()
  const mes = parametros.get('mes') || hojeISO().slice(0, 7)
  const classificacao = ehClassificacao(parametros.get('classificacao')) ? (parametros.get('classificacao') as Classificacao) : ''
  const tipo = parametros.get('tipo') ?? ''
  const { data, isPending, error } = useDespesasDoMes(mes)
  const tipos = useTiposDespesa()
  const recebimentos = useRecebimentosDoMes(mes)

  function definir(novos: Record<string, string>) {
    const atualizados = new URLSearchParams(parametros)
    for (const [chave, valor] of Object.entries(novos)) {
      if (valor) atualizados.set(chave, valor)
      else atualizados.delete(chave)
    }
    setParametros(atualizados, { replace: true })
  }

  const filtradas = useMemo(
    () =>
      (data ?? []).filter(
        (d) => (!classificacao || d.tipo?.classificacao === classificacao) && (!tipo || d.tipo_despesa_id === tipo),
      ),
    [data, classificacao, tipo],
  )

  // Canceladas aparecem na lista, mas não entram nos totais.
  const totais = useMemo(() => {
    const total = { direta: 0, indireta: 0 }
    for (const d of filtradas) {
      if (d.status === 'ativa' && ehClassificacao(d.tipo?.classificacao)) total[d.tipo.classificacao] += centavosDoBanco(d.valor)
    }
    return total
  }, [filtradas])

  const taxasDoMes = useMemo(
    () =>
      (recebimentos.data ?? [])
        .filter((r) => r.status === 'confirmado')
        .reduce((soma, r) => soma + centavosDoBanco(r.taxa), 0),
    [recebimentos.data],
  )

  const tiposDoFiltro = (tipos.data ?? []).filter((t) => !classificacao || t.classificacao === classificacao)

  return (
    <>
      <CabecalhoPagina
        titulo="Despesas"
        acoes={
          <>
            <BotaoLink para="/despesas/tipos" variante="secundario">
              Tipos de despesa
            </BotaoLink>
            <BotaoLink para="/despesas/nova">Lançar despesa</BotaoLink>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Mês" type="month" value={mes} onChange={(e) => definir({ mes: e.target.value })} />
        <Selecao
          rotulo="Classificação"
          value={classificacao}
          onChange={(e) => {
            const nova = e.target.value
            const tipoAtual = tipos.data?.find((t) => t.id === tipo)
            // Tipo de outra classificação não faz sentido junto: limpa.
            definir({ classificacao: nova, tipo: tipoAtual && nova && tipoAtual.classificacao !== nova ? '' : tipo })
          }}
        >
          <option value="">Todas</option>
          {(Object.keys(CLASSIFICACOES) as Classificacao[]).map((c) => (
            <option key={c} value={c}>
              {CLASSIFICACOES[c].plural} ({CLASSIFICACOES[c].explicacao})
            </option>
          ))}
        </Selecao>
        <Selecao rotulo="Tipo" value={tipo} onChange={(e) => definir({ tipo: e.target.value })}>
          <option value="">Todos</option>
          {tiposDoFiltro.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
              {t.ativo ? '' : ' (desativado)'}
            </option>
          ))}
        </Selecao>
      </div>

      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar as despesas.</Alerta>
      ) : (
        <>
          <dl className="mb-4 grid gap-3 sm:grid-cols-3">
            <Indicador rotulo="Diretas" valor={formatarReais(totais.direta)} />
            <Indicador rotulo="Indiretas" valor={formatarReais(totais.indireta)} />
            <Indicador rotulo={`Total em ${formatarMes(mes)}`} valor={formatarReais(totais.direta + totais.indireta)} />
          </dl>
          {taxasDoMes > 0 && classificacao !== 'indireta' && !tipo && (
            <p className="mb-4 text-sm text-stone-600">
              Fora desta lista: {formatarReais(taxasDoMes)} de taxas de cartão do mês, lançadas nos recebimentos. No painel e no resultado
              dos trabalhos elas contam como despesa direta.
            </p>
          )}
          {filtradas.length === 0 ? (
            <Alerta>{data.length === 0 ? 'Nenhuma despesa neste mês.' : 'Nenhuma despesa com esses filtros.'}</Alerta>
          ) : (
            <TabelaDespesas despesas={filtradas} mostrarTrabalho />
          )}
        </>
      )}
    </>
  )
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <dt className="text-sm text-stone-600 first-letter:uppercase">{rotulo}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{valor}</dd>
    </div>
  )
}
