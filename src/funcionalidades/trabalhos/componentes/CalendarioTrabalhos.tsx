import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { Carregando } from '../../../componentes/ui/Carregando'
import { formatarMes, hojeISO } from '../../../lib/datas'
import { somarMesesAM } from '../../painel/periodo'
import { diaCurto, eventosPorDia, gradeDoMes, horaCurta } from '../calendario'
import { useEventos, useQuantosSemData } from '../consultas'
import { useNomeTipo } from '../../tipos-trabalho/consultas'
import { infoStatusTrabalho } from '../rotulos'

type Props = {
  mes: string
  mostrarCancelados: boolean
  onMes: (mes: string) => void
  onMostrarCancelados: (mostrar: boolean) => void
}

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const POR_DIA = 3

// Barra de cor do status (o nome do status também vai no texto, para não depender da cor).
const BARRA_STATUS: Record<string, string> = {
  orcamento: 'border-l-stone-400',
  em_andamento: 'border-l-blue-500',
  concluido: 'border-l-emerald-500',
  cancelado: 'border-l-red-400',
}

export function CalendarioTrabalhos({ mes, mostrarCancelados, onMes, onMostrarCancelados }: Props) {
  const hoje = hojeISO()
  const semanas = useMemo(() => gradeDoMes(mes), [mes])
  const inicio = semanas[0][0].data
  const fim = semanas[semanas.length - 1][6].data
  const eventos = useEventos(inicio, fim, mostrarCancelados)
  const semData = useQuantosSemData()
  const nomeTipo = useNomeTipo()
  const porDia = useMemo(() => eventosPorDia(eventos.data ?? []), [eventos.data])
  const [abertos, setAbertos] = useState<Set<string>>(new Set())

  const diasComEvento = semanas.flat().filter((d) => d.doMes && porDia.has(d.data))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Botao variante="secundario" className="px-3!" aria-label="Mês anterior" onClick={() => onMes(somarMesesAM(mes, -1))}>
            ‹
          </Botao>
          <h2 className="min-w-44 text-center text-lg font-semibold text-stone-900 first-letter:uppercase" aria-live="polite">
            {formatarMes(mes)}
          </h2>
          <Botao variante="secundario" className="px-3!" aria-label="Próximo mês" onClick={() => onMes(somarMesesAM(mes, 1))}>
            ›
          </Botao>
          {mes !== hoje.slice(0, 7) && (
            <Botao variante="link" onClick={() => onMes(hoje.slice(0, 7))}>
              Hoje
            </Botao>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" checked={mostrarCancelados} onChange={(e) => onMostrarCancelados(e.target.checked)} className="accent-stone-900" />
          Mostrar cancelados
        </label>
      </div>

      {eventos.isPending ? (
        <Carregando />
      ) : eventos.error ? (
        <Alerta tipo="erro">Não foi possível carregar o calendário.</Alerta>
      ) : (
        <div className={`transition-opacity ${eventos.isPlaceholderData ? 'opacity-60' : ''}`}>
          {/* Computador e tablet: grade do mês. */}
          <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white sm:block">
            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-medium uppercase tracking-wide text-stone-500">
              {SEMANA.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            {semanas.map((semana) => (
              <div key={semana[0].data} className="grid grid-cols-7 divide-x divide-stone-100 border-b border-stone-100 last:border-b-0">
                {semana.map((dia) => {
                  const lista = porDia.get(dia.data) ?? []
                  const aberto = abertos.has(dia.data)
                  const visiveis = aberto ? lista : lista.slice(0, POR_DIA)
                  const ehHoje = dia.data === hoje
                  return (
                    <div key={dia.data} className={`min-h-28 p-1.5 ${dia.doMes ? '' : 'bg-stone-50/70'}`}>
                      <div className="mb-1 flex justify-end">
                        <span
                          className={`inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
                            ehHoje ? 'bg-stone-900 font-semibold text-white' : dia.doMes ? 'text-stone-700' : 'text-stone-400'
                          }`}
                          aria-label={ehHoje ? `Hoje, ${dia.dia}` : undefined}
                        >
                          {dia.dia}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {visiveis.map((e) => {
                          const status = infoStatusTrabalho(e.status)
                          return (
                            <li key={e.id}>
                              <Link
                                to={`/trabalhos/${e.id}`}
                                title={[horaCurta(e.hora_evento), e.descricao, e.local_evento, status.rotulo].filter(Boolean).join(' · ')}
                                className={`block truncate rounded border-l-4 bg-stone-100 px-1.5 py-1 text-xs text-stone-800 hover:bg-stone-200 ${BARRA_STATUS[e.status] ?? 'border-l-stone-400'} ${e.status === 'cancelado' ? 'line-through opacity-70' : ''}`}
                              >
                                {e.hora_evento && <span className="font-semibold tabular-nums">{horaCurta(e.hora_evento)} </span>}
                                {e.descricao}
                                <span className="sr-only"> ({status.rotulo})</span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                      {lista.length > POR_DIA && (
                        <button
                          type="button"
                          className="mt-1 text-xs font-medium text-stone-600 underline-offset-2 hover:underline"
                          onClick={() =>
                            setAbertos((atual) => {
                              const novo = new Set(atual)
                              if (aberto) novo.delete(dia.data)
                              else novo.add(dia.data)
                              return novo
                            })
                          }
                        >
                          {aberto ? 'Mostrar menos' : `+${lista.length - POR_DIA} mais`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Celular: lista dos dias com evento. */}
          <div className="sm:hidden">
            {diasComEvento.length === 0 ? (
              <Alerta>Nenhum evento em {formatarMes(mes)}.</Alerta>
            ) : (
              <ol className="space-y-4">
                {diasComEvento.map((dia) => (
                  <li key={dia.data}>
                    <h3 className={`mb-1.5 text-sm font-semibold ${dia.data === hoje ? 'text-stone-900' : 'text-stone-600'}`}>
                      {diaCurto(dia.data)}
                      {dia.data === hoje && ' · hoje'}
                    </h3>
                    <ul className="space-y-2">
                      {porDia.get(dia.data)!.map((e) => {
                        const status = infoStatusTrabalho(e.status)
                        return (
                          <li key={e.id}>
                            <Link
                              to={`/trabalhos/${e.id}`}
                              className={`block rounded-lg border border-l-4 border-stone-200 bg-white px-3 py-2 ${BARRA_STATUS[e.status] ?? ''}`}
                            >
                              <p className={`text-sm font-medium text-stone-900 ${e.status === 'cancelado' ? 'line-through' : ''}`}>
                                {e.hora_evento && <span className="tabular-nums">{horaCurta(e.hora_evento)} · </span>}
                                {e.descricao}
                              </p>
                              <p className="text-xs text-stone-500">
                                {[nomeTipo(e.tipo), e.cliente?.nome, e.local_evento, status.rotulo].filter(Boolean).join(' · ')}
                              </p>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600" aria-label="Legenda das cores">
        {(['orcamento', 'em_andamento', 'concluido'] as const).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block h-3 w-1 rounded-sm border-l-4 ${BARRA_STATUS[s]}`} />
            {infoStatusTrabalho(s).rotulo}
          </li>
        ))}
      </ul>

      {(semData.data ?? 0) > 0 && (
        <Alerta>
          {semData.data === 1 ? '1 trabalho ainda não tem' : `${semData.data} trabalhos ainda não têm`} data de evento e não aparece no calendário.{' '}
          <Link to="/trabalhos" className="font-medium underline underline-offset-4">
            Ver na lista
          </Link>
        </Alerta>
      )}
    </div>
  )
}
