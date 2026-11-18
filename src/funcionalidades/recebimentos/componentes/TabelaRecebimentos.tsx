import { Link } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { BotaoConfirmar } from '../../../componentes/ui/BotaoConfirmar'
import { Selo } from '../../../componentes/ui/Selo'
import { formatarData } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { mensagemErroBanco } from '../../../lib/erros'
import { AcoesRecibo } from '../../recibos/componentes/AcoesRecibo'
import { rotuloParcela } from '../../trabalhos/plano'
import { useEstornarRecebimento, type LinhaRecebimento } from '../consultas'
import { rotuloForma } from '../rotulos'

type Props = {
  recebimentos: LinhaRecebimento[]
  /** Na lista geral mostra o trabalho; no detalhe do trabalho, não precisa. */
  mostrarTrabalho?: boolean
}

export function TabelaRecebimentos({ recebimentos, mostrarTrabalho = false }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className={`w-full text-sm ${mostrarTrabalho ? 'min-w-[56rem]' : 'min-w-[44rem]'}`}>
        <thead className="bg-stone-50 text-left text-stone-600">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Data</th>
            {mostrarTrabalho && <th scope="col" className="px-4 py-2.5 font-medium">Trabalho</th>}
            <th scope="col" className="px-4 py-2.5 font-medium">Referência</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Forma</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Valor</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Recibo</th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {recebimentos.map((r) => (
            <Linha key={r.id} recebimento={r} mostrarTrabalho={mostrarTrabalho} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Linha({ recebimento: r, mostrarTrabalho }: { recebimento: LinhaRecebimento; mostrarTrabalho: boolean }) {
  const estornar = useEstornarRecebimento()
  const estornado = r.status === 'estornado'
  const taxa = centavosDoBanco(r.taxa)
  const referencia = r.parcela_numero === null ? 'Sem parcela' : rotuloParcela(r.parcela_numero, r.total_parcelas ?? 0)

  return (
    <tr className={`align-top ${estornado ? 'text-stone-400' : ''}`}>
      <td className="whitespace-nowrap px-4 py-3">{formatarData(r.data_recebimento)}</td>
      {mostrarTrabalho && (
        <td className="px-4 py-3">
          <Link to={`/trabalhos/${r.trabalho_id}`} className="font-medium text-stone-900 underline-offset-4 hover:underline">
            {r.trabalho_descricao}
          </Link>
          <p className="text-stone-500">{r.cliente_nome}</p>
        </td>
      )}
      <td className="px-4 py-3">
        {referencia}
        {r.observacoes && <p className="max-w-56 truncate text-xs text-stone-500" title={r.observacoes}>{r.observacoes}</p>}
      </td>
      <td className="whitespace-nowrap px-4 py-3">{rotuloForma(r.forma_pagamento)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
        <span className={estornado ? 'line-through' : 'font-medium text-stone-900'}>{formatarReais(centavosDoBanco(r.valor))}</span>
        {taxa > 0 && <p className="text-xs text-stone-500">taxa {formatarReais(taxa)}</p>}
      </td>
      <td className="px-4 py-3">
        {estornado ? <Selo cor="vermelho">Estornado</Selo> : <AcoesRecibo recebimento={r} />}
      </td>
      <td className="px-4 py-3">
        {!estornado && (
          <div className="space-y-1">
            <BotaoConfirmar
              pergunta={r.recibo_id ? 'Estornar? O recibo será cancelado.' : 'Estornar este recebimento?'}
              rotuloConfirmar="Estornar"
              perigoso
              carregando={estornar.isPending}
              onConfirmar={() => estornar.mutate(r.id)}
            >
              Estornar
            </BotaoConfirmar>
            {estornar.error && <Alerta tipo="erro">{mensagemErroBanco(estornar.error)}</Alerta>}
          </div>
        )}
      </td>
    </tr>
  )
}
