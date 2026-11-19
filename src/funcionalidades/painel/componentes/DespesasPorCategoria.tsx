// Barras horizontais com o total de cada tipo de despesa no período.
// Uma série só (cor das despesas no painel), separada em diretas e indiretas;
// nome e valor em texto em cada linha, então a lista também é a tabela.
import { Alerta } from '../../../componentes/ui/Alerta'
import { Carregando } from '../../../componentes/ui/Carregando'
import { formatarReais } from '../../../lib/dinheiro'
import { CLASSIFICACOES } from '../../despesas/rotulos'
import type { LinhaCategoria } from '../categorias'
import { useDespesasPorCategoria } from '../consultas'

export function DespesasPorCategoria({ inicio, fim, rotulo, cor }: { inicio: string; fim: string; rotulo: string; cor: string }) {
  const { data, isPending, error, isPlaceholderData } = useDespesasPorCategoria(inicio, fim)
  const maior = Math.max(0, ...(data ?? []).map((c) => c.total))

  return (
    <section aria-labelledby="titulo-categorias" className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 id="titulo-categorias" className="text-base font-semibold text-stone-900">
        Despesas por categoria
      </h2>
      <p className="mb-4 text-sm text-stone-500">Em {rotulo}. As taxas de cartão contam como despesa direta.</p>
      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar as despesas.</Alerta>
      ) : data.length === 0 ? (
        <Alerta>Nenhuma despesa no período.</Alerta>
      ) : (
        <div className={`space-y-5 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {(['direta', 'indireta'] as const).map((classificacao) => {
            const grupo = data.filter((c) => c.classificacao === classificacao)
            if (grupo.length === 0) return null
            const total = grupo.reduce((soma, c) => soma + c.total, 0)
            return (
              <div key={classificacao}>
                <h3 className="mb-2 flex justify-between text-sm font-medium text-stone-700">
                  <span>{CLASSIFICACOES[classificacao].plural}</span>
                  <span className="tabular-nums">{formatarReais(total)}</span>
                </h3>
                <ul className="space-y-2">
                  {grupo.map((c) => (
                    <Linha key={c.chave} categoria={c} maior={maior} cor={cor} />
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Linha({ categoria, maior, cor }: { categoria: LinhaCategoria; maior: number; cor: string }) {
  const largura = maior > 0 ? Math.max((categoria.total / maior) * 100, 1) : 0
  return (
    <li className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto]">
      <span className="truncate text-stone-700" title={categoria.nome}>
        {categoria.nome}
      </span>
      <span aria-hidden className="block h-3 rounded-r bg-stone-100">
        <span className="block h-3 rounded-r" style={{ width: `${largura}%`, background: cor }} />
      </span>
      <span className="text-right tabular-nums text-stone-900">{formatarReais(categoria.total)}</span>
    </li>
  )
}
