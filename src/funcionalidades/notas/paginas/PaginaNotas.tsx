import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selo } from '../../../componentes/ui/Selo'
import { formatarData, formatarMes, hojeISO } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { AcoesNota } from '../componentes/AcoesNota'
import { useNotasDoMes, useNotasPendentes, type Nota } from '../consultas'
import { infoStatusNota } from '../esquemas'

export function PaginaNotas() {
  const [parametros, setParametros] = useSearchParams()
  const mes = parametros.get('mes') || hojeISO().slice(0, 7)
  const notas = useNotasDoMes(mes)

  // Nota cancelada ou substituída não entra no total (continua visível).
  const faturado = useMemo(
    () => (notas.data ?? []).filter((n) => n.status === 'emitida').reduce((soma, n) => soma + centavosDoBanco(n.valor_servico), 0),
    [notas.data],
  )

  return (
    <>
      <CabecalhoPagina titulo="Notas fiscais" acoes={<BotaoLink para="/notas/nova">Registrar nota</BotaoLink>} />

      <Pendentes />

      <section aria-labelledby="titulo-notas-mes" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="titulo-notas-mes" className="text-base font-semibold text-stone-900">
            Notas por competência
          </h2>
          <Campo rotulo="Mês de competência" type="month" value={mes} onChange={(e) => setParametros(e.target.value ? { mes: e.target.value } : {}, { replace: true })} />
        </div>

        {notas.isPending ? (
          <Carregando />
        ) : notas.error ? (
          <Alerta tipo="erro">Não foi possível carregar as notas.</Alerta>
        ) : (
          <>
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 sm:max-w-sm">
              <p className="text-sm text-stone-600 first-letter:uppercase">Faturado em {formatarMes(mes)}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{formatarReais(faturado)}</p>
            </div>
            {notas.data.length === 0 ? (
              <Alerta>Nenhuma nota com competência em {formatarMes(mes)}.</Alerta>
            ) : (
              <TabelaNotas notas={notas.data} />
            )}
          </>
        )}
      </section>
    </>
  )
}

function Pendentes() {
  const { data, isPending, error } = useNotasPendentes()
  if (isPending || error || data.length === 0) return null
  return (
    <section aria-labelledby="titulo-pendentes" className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h2 id="titulo-pendentes" className="mb-3 text-base font-semibold text-amber-900">
        Trabalhos concluídos sem nota ({data.length})
      </h2>
      <ul className="divide-y divide-amber-200">
        {data.map((t) => (
          <li key={t.trabalho_id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div className="text-sm">
              <Link to={`/trabalhos/${t.trabalho_id}`} className="font-medium text-stone-900 underline-offset-4 hover:underline">
                {t.descricao}
              </Link>
              <p className="text-stone-600">
                {t.cliente_nome} · {formatarReais(centavosDoBanco(t.valor_total))} · concluído em {formatarData(t.data_conclusao)}
              </p>
            </div>
            <BotaoLink para={`/notas/nova?trabalho=${t.trabalho_id}`}>Registrar nota</BotaoLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TabelaNotas({ notas }: { notas: Nota[] }) {
  return (
    <div className="relative overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="bg-stone-50 text-left text-stone-600">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Nota</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Emissão</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Trabalho</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Valor</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              <span className="sr-only">Arquivos e ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {notas.map((n) => (
            <LinhaNota key={n.id} nota={n} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LinhaNota({ nota: n }: { nota: Nota }) {
  const status = infoStatusNota(n.status)
  const ativa = n.status === 'emitida'
  const divergente = ativa && n.trabalho && centavosDoBanco(n.valor_servico) !== centavosDoBanco(n.trabalho.valor_total)
  return (
    <tr className={`align-top ${ativa ? '' : 'text-stone-500'}`}>
      <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium text-stone-900">
        {n.numero}
      </th>
      <td className="whitespace-nowrap px-4 py-3">{formatarData(n.data_emissao)}</td>
      <td className="px-4 py-3">
        {n.trabalho && (
          <>
            <Link to={`/trabalhos/${n.trabalho.id}`} className="font-medium text-stone-900 underline-offset-4 hover:underline">
              {n.trabalho.descricao}
            </Link>
            <p className="text-stone-500">{n.trabalho.cliente?.nome}</p>
          </>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
        <span className={ativa ? 'font-medium text-stone-900' : 'line-through'}>{formatarReais(centavosDoBanco(n.valor_servico))}</span>
        {divergente && (
          <p className="mt-1">
            <Selo cor="amarelo">Total do trabalho: {formatarReais(centavosDoBanco(n.trabalho!.valor_total))}</Selo>
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <Selo cor={status.cor}>{status.rotulo}</Selo>
        {n.motivo_cancelamento && <p className="mt-1 max-w-48 text-xs">{n.motivo_cancelamento}</p>}
      </td>
      <td className="px-4 py-3">
        <AcoesNota nota={n} />
      </td>
    </tr>
  )
}
