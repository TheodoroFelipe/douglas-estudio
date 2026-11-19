import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { BotaoConfirmar } from '../../../componentes/ui/BotaoConfirmar'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selo } from '../../../componentes/ui/Selo'
import { formatarData } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { mensagemErroBanco } from '../../../lib/erros'
import { DespesasDoTrabalho, ResultadoDoTrabalho } from '../../despesas/componentes/SecoesTrabalho'
import { SecaoNotaTrabalho } from '../../notas/componentes/SecaoNotaTrabalho'
import { TabelaRecebimentos } from '../../recebimentos/componentes/TabelaRecebimentos'
import { useRecebimentosDoTrabalho } from '../../recebimentos/consultas'
import { useAlterarStatusTrabalho, useTrabalho } from '../consultas'
import { rotuloParcela } from '../plano'
import { useNomeTipo } from '../../tipos-trabalho/consultas'
import { infoStatusParcela, infoStatusTrabalho, type StatusTrabalho } from '../rotulos'

export function PaginaTrabalho() {
  const { id } = useParams()
  const { data, isPending, error } = useTrabalho(id)
  const nomeTipo = useNomeTipo()

  if (isPending) return <Carregando />
  if (error || !data) {
    return (
      <>
        <CabecalhoPagina titulo="Trabalho" voltar={{ para: '/trabalhos', rotulo: 'Trabalhos' }} />
        <Alerta tipo="erro">{error ? 'Não foi possível carregar o trabalho.' : 'Trabalho não encontrado.'}</Alerta>
      </>
    )
  }

  const { trabalho, resumo, parcelas } = data
  const status = infoStatusTrabalho(trabalho.status)
  const contratado = centavosDoBanco(trabalho.valor_total)
  const recebido = centavosDoBanco(resumo?.total_recebido)
  const totalParcelas = parcelas.filter((p) => p.numero > 0).length
  const podeReceber = trabalho.status !== 'cancelado' && contratado - recebido > 0

  return (
    <>
      <CabecalhoPagina
        titulo={trabalho.descricao}
        voltar={{ para: '/trabalhos', rotulo: 'Trabalhos' }}
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            <Selo cor={status.cor}>{status.rotulo}</Selo>
            <span>{nomeTipo(trabalho.tipo)}</span>
            <span aria-hidden>·</span>
            {trabalho.cliente ? (
              <Link to={`/clientes/${trabalho.cliente.id}`} className="underline underline-offset-4 hover:text-stone-900">
                {trabalho.cliente.nome}
              </Link>
            ) : null}
          </span>
        }
        acoes={
          <>
            {podeReceber && <BotaoLink para={`/recebimentos/novo?trabalho=${trabalho.id}`}>Registrar recebimento</BotaoLink>}
            <BotaoLink para={`/trabalhos/${trabalho.id}/editar`} variante="secundario">
              Editar
            </BotaoLink>
          </>
        }
      />

      <AcoesStatus id={trabalho.id} status={trabalho.status as StatusTrabalho} temRecebimento={recebido > 0} />

      <dl className="mb-8 grid gap-3 sm:grid-cols-3">
        <Indicador rotulo="Contratado" valor={formatarReais(contratado)} />
        <Indicador rotulo="Recebido" valor={formatarReais(recebido)} />
        <Indicador rotulo="A receber" valor={formatarReais(contratado - recebido)} destaque={contratado - recebido > 0} />
      </dl>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="titulo-parcelas">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="titulo-parcelas" className="text-base font-semibold text-stone-900">
                Parcelas
              </h2>
              <BotaoLink para={`/trabalhos/${trabalho.id}/editar#plano`} variante="secundario" className="px-3! py-1.5!">
                Editar parcelas
              </BotaoLink>
            </div>
            <div className="relative overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="bg-stone-50 text-left text-stone-600">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Parcela</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Vencimento</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Valor</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Pago</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                    {podeReceber && (
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        <span className="sr-only">Receber</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {parcelas.map((p) => {
                    const info = infoStatusParcela(p.status)
                    return (
                      <tr key={p.id}>
                        <th scope="row" className="px-4 py-2.5 text-left font-medium text-stone-800">
                          {rotuloParcela(p.numero, totalParcelas)}
                        </th>
                        <td className="whitespace-nowrap px-4 py-2.5 text-stone-700">{formatarData(p.vencimento)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatarReais(centavosDoBanco(p.valor))}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-stone-600">
                          {formatarReais(centavosDoBanco(p.valor_pago))}
                        </td>
                        <td className="px-4 py-2.5">
                          <Selo cor={info.cor}>{info.rotulo}</Selo>
                        </td>
                        {podeReceber && (
                          <td className="px-4 py-2.5 text-right">
                            {centavosDoBanco(p.saldo) > 0 && (
                              <Link
                                to={`/recebimentos/novo?trabalho=${trabalho.id}&parcela=${p.id}`}
                                className="font-medium text-stone-700 underline underline-offset-4 hover:text-stone-900"
                                aria-label={`Receber ${rotuloParcela(p.numero, totalParcelas)}`}
                              >
                                Receber
                              </Link>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <RecebimentosDoTrabalho trabalhoId={trabalho.id} />
          <DespesasDoTrabalho trabalhoId={trabalho.id} />
        </div>

        <aside className="space-y-6">
          <SecaoNotaTrabalho trabalhoId={trabalho.id} statusTrabalho={trabalho.status} valorTotalCentavos={contratado} />
          <ResultadoDoTrabalho trabalhoId={trabalho.id} />

          <section aria-labelledby="titulo-dados" className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 id="titulo-dados" className="mb-3 text-base font-semibold text-stone-900">
              Dados
            </h2>
            <dl className="space-y-2 text-sm">
              <Dado rotulo="Data do evento">
                {formatarData(trabalho.data_evento) || '—'}
                {trabalho.hora_evento && `, ${trabalho.hora_evento.slice(0, 5)}`}
              </Dado>
              {trabalho.local_evento && <Dado rotulo="Local">{trabalho.local_evento}</Dado>}
              <Dado rotulo="Concluído em">{formatarData(trabalho.data_conclusao) || '—'}</Dado>
              <Dado rotulo="Contrato">{trabalho.numero_contrato || '—'}</Dado>
            </dl>
          </section>

        </aside>
      </div>
    </>
  )
}

function RecebimentosDoTrabalho({ trabalhoId }: { trabalhoId: string }) {
  const { data, isPending, error } = useRecebimentosDoTrabalho(trabalhoId)
  return (
    <section aria-labelledby="titulo-recebimentos">
      <h2 id="titulo-recebimentos" className="mb-3 text-base font-semibold text-stone-900">
        Recebimentos
      </h2>
      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar os recebimentos.</Alerta>
      ) : data.length === 0 ? (
        <Alerta>Nenhum recebimento registrado.</Alerta>
      ) : (
        <TabelaRecebimentos recebimentos={data} />
      )}
    </section>
  )
}

function AcoesStatus({ id, status, temRecebimento }: { id: string; status: StatusTrabalho; temRecebimento: boolean }) {
  const alterar = useAlterarStatusTrabalho()
  const mudar = (novo: StatusTrabalho) => alterar.mutate({ id, status: novo })

  let acoes: ReactNode
  if (status === 'orcamento' || status === 'em_andamento') {
    acoes = (
      <>
        <BotaoConfirmar pergunta="Concluir o trabalho? Depois, registre a nota fiscal." rotuloConfirmar="Concluir" carregando={alterar.isPending} onConfirmar={() => mudar('concluido')}>
          Concluir trabalho
        </BotaoConfirmar>
        <BotaoConfirmar pergunta="Cancelar este trabalho?" rotuloConfirmar="Cancelar trabalho" perigoso carregando={alterar.isPending} onConfirmar={() => mudar('cancelado')}>
          Cancelar trabalho
        </BotaoConfirmar>
      </>
    )
  } else if (status === 'concluido') {
    acoes = (
      <>
        <BotaoConfirmar pergunta="Reabrir o trabalho (volta para em andamento)?" rotuloConfirmar="Reabrir" carregando={alterar.isPending} onConfirmar={() => mudar('em_andamento')}>
          Reabrir
        </BotaoConfirmar>
        <BotaoConfirmar pergunta="Cancelar este trabalho?" rotuloConfirmar="Cancelar trabalho" perigoso carregando={alterar.isPending} onConfirmar={() => mudar('cancelado')}>
          Cancelar trabalho
        </BotaoConfirmar>
      </>
    )
  } else {
    acoes = (
      <Botao variante="secundario" carregando={alterar.isPending} onClick={() => mudar(temRecebimento ? 'em_andamento' : 'orcamento')}>
        Reativar trabalho
      </Botao>
    )
  }

  return (
    <div className="mb-6 space-y-3">
      {/* key: ao mudar o status, os botões começam do zero (sem "confirmando" herdado). */}
      <div key={status} className="flex flex-wrap gap-2">
        {acoes}
      </div>
      {alterar.error && <Alerta tipo="erro">{mensagemErroBanco(alterar.error)}</Alerta>}
    </div>
  )
}

function Indicador({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <dt className="text-sm text-stone-600">{rotulo}</dt>
      <dd className={`mt-1 text-xl font-semibold tabular-nums ${destaque ? 'text-amber-700' : 'text-stone-900'}`}>{valor}</dd>
    </div>
  )
}

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-600">{rotulo}</dt>
      <dd className="text-right text-stone-900">{children}</dd>
    </div>
  )
}
