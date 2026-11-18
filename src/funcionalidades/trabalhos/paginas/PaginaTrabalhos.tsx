import { useMemo } from 'react'
import { Link, NavLink, useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selecao } from '../../../componentes/ui/Selecao'
import { Selo } from '../../../componentes/ui/Selo'
import { formatarData, hojeISO } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { normalizarBusca } from '../../clientes/esquemas'
import { CalendarioTrabalhos } from '../componentes/CalendarioTrabalhos'
import { useTrabalhos } from '../consultas'
import { infoStatusTrabalho, rotuloTipo, STATUS_TRABALHO, TIPOS_TRABALHO } from '../rotulos'

function ListaTrabalhos() {
  const { data, isPending, error } = useTrabalhos()
  // Filtros na URL: dá para voltar do detalhe sem perder a seleção.
  const [parametros, setParametros] = useSearchParams()
  const status = parametros.get('status') ?? 'ativos'
  const tipo = parametros.get('tipo') ?? ''
  const mes = parametros.get('mes') ?? ''
  const busca = parametros.get('busca') ?? ''

  function definir(chave: string, valor: string) {
    const novos = new URLSearchParams(parametros)
    if (valor) novos.set(chave, valor)
    else novos.delete(chave)
    setParametros(novos, { replace: true })
  }

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca)
    return (data ?? []).filter((t) => {
      const passaStatus = status === 'todos' || (status === 'ativos' ? t.status !== 'cancelado' : t.status === status)
      if (!passaStatus) return false
      if (tipo && t.tipo !== tipo) return false
      if (mes && !(t.data_evento ?? '').startsWith(mes)) return false
      if (termo && !normalizarBusca(`${t.descricao} ${t.cliente_nome}`).includes(termo)) return false
      return true
    })
  }, [data, status, tipo, mes, busca])

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Buscar" type="search" placeholder="Descrição ou cliente" value={busca} onChange={(e) => definir('busca', e.target.value)} />
        <Selecao rotulo="Status" value={status} onChange={(e) => definir('status', e.target.value === 'ativos' ? '' : e.target.value)}>
          <option value="ativos">Todos, menos cancelados</option>
          <option value="todos">Todos</option>
          {Object.entries(STATUS_TRABALHO).map(([valor, { rotulo }]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Selecao>
        <Selecao rotulo="Tipo" value={tipo} onChange={(e) => definir('tipo', e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(TIPOS_TRABALHO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Selecao>
        <Campo rotulo="Mês do evento" type="month" value={mes} onChange={(e) => definir('mes', e.target.value)} />
      </div>

      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar os trabalhos.</Alerta>
      ) : filtrados.length === 0 ? (
        <Alerta>{data.length === 0 ? 'Nenhum trabalho cadastrado ainda.' : 'Nenhum trabalho com esses filtros.'}</Alerta>
      ) : (
        <div className="relative overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Trabalho</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Evento</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Contratado</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Recebido</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">A receber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtrados.map((t) => {
                const info = infoStatusTrabalho(t.status)
                return (
                  <tr key={t.trabalho_id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link to={`/trabalhos/${t.trabalho_id}`} className="font-medium text-stone-900 underline-offset-4 hover:underline">
                        {t.descricao}
                      </Link>
                      <p className="text-stone-500">
                        {t.cliente_nome} · {rotuloTipo(t.tipo)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-700">{formatarData(t.data_evento) || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Selo cor={info.cor}>{info.rotulo}</Selo>
                        {t.nota_pendente && <Selo cor="amarelo">Nota pendente</Selo>}
                        {t.nota_divergente && <Selo cor="amarelo">Nota divergente</Selo>}
                        {!!t.parcelas_vencidas && <Selo cor="vermelho">{t.parcelas_vencidas} vencida{t.parcelas_vencidas > 1 ? 's' : ''}</Selo>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatarReais(centavosDoBanco(t.valor_total))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatarReais(centavosDoBanco(t.total_recebido))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatarReais(centavosDoBanco(t.saldo_a_receber))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export function PaginaTrabalhos() {
  const [parametros, setParametros] = useSearchParams()
  const calendario = parametros.get('aba') === 'calendario'
  const mesCalendario = /^\d{4}-(0[1-9]|1[0-2])$/.test(parametros.get('mes') ?? '') ? parametros.get('mes')! : hojeISO().slice(0, 7)
  const mostrarCancelados = parametros.get('cancelados') === '1'

  function definirCalendario(mes: string, cancelados: boolean) {
    const novos: Record<string, string> = { aba: 'calendario', mes }
    if (cancelados) novos.cancelados = '1'
    setParametros(novos, { replace: true })
  }

  const aba = (ativa: boolean) =>
    `-mb-px border-b-2 px-3 py-2 text-sm font-medium ${ativa ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'}`

  return (
    <>
      <CabecalhoPagina titulo="Trabalhos" acoes={<BotaoLink para="/trabalhos/novo">Novo trabalho</BotaoLink>} />
      <nav aria-label="Visualização" className="mb-5 flex gap-2 border-b border-stone-200">
        <NavLink to="/trabalhos" end className={() => aba(!calendario)} aria-current={!calendario ? 'page' : undefined}>
          Lista
        </NavLink>
        <NavLink to="/trabalhos?aba=calendario" className={() => aba(calendario)} aria-current={calendario ? 'page' : undefined}>
          Calendário
        </NavLink>
      </nav>
      {calendario ? (
        <CalendarioTrabalhos
          mes={mesCalendario}
          mostrarCancelados={mostrarCancelados}
          onMes={(mes) => definirCalendario(mes, mostrarCancelados)}
          onMostrarCancelados={(mostrar) => definirCalendario(mesCalendario, mostrar)}
        />
      ) : (
        <ListaTrabalhos />
      )}
    </>
  )
}
