// Despesas e resultado no detalhe do trabalho.
import { Alerta } from '../../../componentes/ui/Alerta'
import { BotaoLink } from '../../../componentes/ui/CabecalhoPagina'
import { Carregando } from '../../../componentes/ui/Carregando'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { useDespesasDoTrabalho, useResultadoTrabalho } from '../consultas'
import { TabelaDespesas } from './TabelaDespesas'

const porcentagem = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function DespesasDoTrabalho({ trabalhoId }: { trabalhoId: string }) {
  const { data, isPending, error } = useDespesasDoTrabalho(trabalhoId)
  const aqui = `/trabalhos/${trabalhoId}`

  return (
    <section aria-labelledby="titulo-despesas">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-despesas" className="text-base font-semibold text-stone-900">
          Despesas diretas
        </h2>
        <BotaoLink para={`/despesas/nova?trabalho=${trabalhoId}`} variante="secundario" className="px-3! py-1.5!">
          Lançar despesa
        </BotaoLink>
      </div>
      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar as despesas.</Alerta>
      ) : data.length === 0 ? (
        <Alerta>Nenhuma despesa lançada neste trabalho.</Alerta>
      ) : (
        <TabelaDespesas despesas={data} voltarPara={aqui} />
      )}
    </section>
  )
}

export function ResultadoDoTrabalho({ trabalhoId }: { trabalhoId: string }) {
  const { data, isPending, error } = useResultadoTrabalho(trabalhoId)

  let conteudo
  if (isPending) conteudo = <Carregando />
  else if (error || !data) conteudo = <Alerta tipo="erro">Não foi possível calcular o resultado.</Alerta>
  else {
    const recebido = centavosDoBanco(data.total_recebido)
    const lancadas = centavosDoBanco(data.despesas_lancadas)
    const taxas = centavosDoBanco(data.taxas_recebimento)
    const resultado = centavosDoBanco(data.resultado)
    conteudo = (
      <dl className="space-y-2 text-sm">
        <Linha rotulo="Recebido" valor={formatarReais(recebido)} />
        <Linha rotulo="Despesas lançadas" valor={`− ${formatarReais(lancadas)}`} />
        {taxas > 0 && <Linha rotulo="Taxas de cartão" valor={`− ${formatarReais(taxas)}`} />}
        <div className="flex justify-between gap-3 border-t border-stone-200 pt-2 font-semibold">
          <dt className="text-stone-900">Resultado</dt>
          <dd className={`tabular-nums ${resultado < 0 ? 'text-red-700' : 'text-stone-900'}`}>{formatarReais(resultado)}</dd>
        </div>
        {data.margem_percentual !== null && (
          <p className="text-right text-xs text-stone-500">
            Margem de {porcentagem.format(Number(data.margem_percentual))}% sobre o recebido
          </p>
        )}
      </dl>
    )
  }

  return (
    <section aria-labelledby="titulo-resultado" className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 id="titulo-resultado" className="mb-1 text-base font-semibold text-stone-900">
        Resultado
      </h2>
      <p className="mb-3 text-xs text-stone-500">Recebido menos as despesas diretas. Despesas do estúdio não entram aqui.</p>
      {conteudo}
    </section>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-600">{rotulo}</dt>
      <dd className="tabular-nums text-stone-900">{valor}</dd>
    </div>
  )
}
