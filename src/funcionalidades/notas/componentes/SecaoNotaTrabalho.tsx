import { Alerta } from '../../../componentes/ui/Alerta'
import { BotaoLink } from '../../../componentes/ui/CabecalhoPagina'
import { Carregando } from '../../../componentes/ui/Carregando'
import { LinkEmissorNfse } from '../../../componentes/ui/LinkEmissorNfse'
import { Selo } from '../../../componentes/ui/Selo'
import { formatarData } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { formatarChave } from '../chave'
import { useNotasDoTrabalho } from '../consultas'
import { infoStatusNota } from '../esquemas'
import { AcoesNota } from './AcoesNota'

type Props = { trabalhoId: string; statusTrabalho: string; valorTotalCentavos: number }

/** Nota fiscal no detalhe do trabalho: a ativa, a pendência e o histórico. */
export function SecaoNotaTrabalho({ trabalhoId, statusTrabalho, valorTotalCentavos }: Props) {
  const { data, isPending, error } = useNotasDoTrabalho(trabalhoId)
  const ativa = data?.find((n) => n.status === 'emitida')
  const historico = data?.filter((n) => n.status !== 'emitida') ?? []

  let conteudo
  if (isPending) conteudo = <Carregando />
  else if (error) conteudo = <Alerta tipo="erro">Não foi possível carregar a nota.</Alerta>
  else if (ativa) {
    const valor = centavosDoBanco(ativa.valor_servico)
    conteudo = (
      <div className="space-y-3 text-sm">
        <dl className="space-y-1.5">
          <div className="flex justify-between gap-3">
            <dt className="text-stone-600">Número</dt>
            <dd className="font-medium text-stone-900">{ativa.numero}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-stone-600">Emissão</dt>
            <dd className="text-stone-900">{formatarData(ativa.data_emissao)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-stone-600">Valor</dt>
            <dd className="font-medium tabular-nums text-stone-900">{formatarReais(valor)}</dd>
          </div>
        </dl>
        <p className="break-all font-mono text-xs text-stone-500" title="Chave de acesso">
          {formatarChave(ativa.chave_acesso)}
        </p>
        {valor !== valorTotalCentavos && (
          <Alerta>Nota divergente: o valor é diferente do total do trabalho ({formatarReais(valorTotalCentavos)}).</Alerta>
        )}
        {!ativa.arquivo_pdf && <Alerta tipo="erro">Falta anexar o PDF desta nota.</Alerta>}
        <AcoesNota nota={ativa} />
      </div>
    )
  } else if (statusTrabalho === 'concluido') {
    conteudo = (
      <div className="space-y-3">
        <Selo cor="amarelo">Nota pendente</Selo>
        <p className="text-sm text-stone-600">Trabalho concluído. Emita a NFS-e com o valor total no Emissor Nacional e registre aqui.</p>
        <div className="flex flex-wrap gap-2">
          <LinkEmissorNfse rotulo="Emitir no gov.br" />
          <BotaoLink para={`/notas/nova?trabalho=${trabalhoId}`}>Registrar nota</BotaoLink>
        </div>
      </div>
    )
  } else if (statusTrabalho === 'cancelado') {
    conteudo = <p className="text-sm text-stone-600">Trabalho cancelado, sem nota.</p>
  } else {
    conteudo = <p className="text-sm text-stone-600">A nota é registrada quando o trabalho for concluído.</p>
  }

  return (
    <section aria-labelledby="titulo-nota" className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 id="titulo-nota" className="mb-3 text-base font-semibold text-stone-900">
        Nota fiscal
      </h2>
      {conteudo}
      {historico.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Histórico</h3>
          <ul className="space-y-2 text-sm">
            {historico.map((n) => {
              const status = infoStatusNota(n.status)
              return (
                <li key={n.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-stone-600">
                    <span>
                      Nota {n.numero} · {formatarReais(centavosDoBanco(n.valor_servico))}
                    </span>
                    <Selo cor={status.cor}>{status.rotulo}</Selo>
                  </div>
                  {n.motivo_cancelamento && <p className="text-xs text-stone-500">{n.motivo_cancelamento}</p>}
                  <AcoesNota nota={n} />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
