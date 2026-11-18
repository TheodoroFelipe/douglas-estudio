import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selecao } from '../../../componentes/ui/Selecao'
import { Selo } from '../../../componentes/ui/Selo'
import { formatarData, hojeISO } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { mensagemErroBanco } from '../../../lib/erros'
import { numeroRecibo } from '../conteudo'
import { useBaixarRecibo, useCancelarRecibo, useGerarPdfRecibo, useRecibos } from '../consultas'
import { mensagemErroRecibo } from '../emissao'

const PRIMEIRO_ANO = 2026
const pequeno = 'px-3! py-1.5!'

export function PaginaRecibos() {
  const [parametros, setParametros] = useSearchParams()
  const anoAtual = Number(hojeISO().slice(0, 4))
  const ano = Number(parametros.get('ano')) || anoAtual
  const { data, isPending, error } = useRecibos(ano)
  const anos = Array.from({ length: Math.max(anoAtual - PRIMEIRO_ANO + 1, 1) }, (_, i) => anoAtual - i)

  return (
    <>
      <CabecalhoPagina
        titulo="Recibos"
        subtitulo="Para emitir um recibo, use o recebimento (no trabalho ou em Recebimentos)."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Selecao rotulo="Ano" value={ano} onChange={(e) => setParametros({ ano: e.target.value }, { replace: true })}>
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Selecao>
      </div>

      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar os recibos.</Alerta>
      ) : data.length === 0 ? (
        <Alerta>Nenhum recibo emitido em {ano}.</Alerta>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Número</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Emissão</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Trabalho</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Valor</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.map((recibo) => (
                <LinhaRecibo key={recibo.id} recibo={recibo} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

type Recibo = NonNullable<ReturnType<typeof useRecibos>['data']>[number]

function LinhaRecibo({ recibo }: { recibo: Recibo }) {
  const baixar = useBaixarRecibo()
  const gerarPdf = useGerarPdfRecibo()
  const numero = numeroRecibo(recibo.ano, recibo.numero)
  const cancelado = recibo.status === 'cancelado'
  const trabalho = recibo.recebimento?.trabalho
  const erro = baixar.error ?? gerarPdf.error

  return (
    <tr className={`align-top ${cancelado ? 'text-stone-500' : ''}`}>
      <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium text-stone-900">
        {numero}
      </th>
      <td className="whitespace-nowrap px-4 py-3">{formatarData(recibo.data_emissao)}</td>
      <td className="px-4 py-3">
        {trabalho && (
          <>
            <Link to={`/trabalhos/${trabalho.id}`} className="font-medium text-stone-900 underline-offset-4 hover:underline">
              {trabalho.descricao}
            </Link>
            <p className="text-stone-500">{trabalho.cliente?.nome}</p>
          </>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
        {formatarReais(centavosDoBanco(recibo.recebimento?.valor))}
      </td>
      <td className="px-4 py-3">
        {cancelado ? (
          <>
            <Selo cor="vermelho">Cancelado</Selo>
            <p className="mt-1 max-w-56 text-xs">{recibo.motivo_cancelamento}</p>
          </>
        ) : (
          <Selo cor="verde">Emitido</Selo>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-start gap-2">
          {recibo.arquivo_pdf ? (
            <Botao
              variante="secundario"
              className={pequeno}
              carregando={baixar.isPending}
              aria-label={`Baixar recibo ${numero}`}
              onClick={() => baixar.mutate({ caminho: recibo.arquivo_pdf!, ano: recibo.ano, numero: recibo.numero })}
            >
              Baixar PDF
            </Botao>
          ) : (
            !cancelado && (
              <Botao variante="secundario" className={pequeno} carregando={gerarPdf.isPending} onClick={() => gerarPdf.mutate(recibo.id)}>
                Gerar PDF
              </Botao>
            )
          )}
          {!cancelado && <CancelarRecibo id={recibo.id} numero={numero} />}
        </div>
        {erro && (
          <p role="alert" className="mt-1 max-w-64 text-xs text-red-700">
            {mensagemErroRecibo(erro)}
          </p>
        )}
      </td>
    </tr>
  )
}

/** Cancelamento com motivo, na própria linha. */
function CancelarRecibo({ id, numero }: { id: string; numero: string }) {
  const cancelar = useCancelarRecibo()
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erroMotivo, setErroMotivo] = useState('')

  if (!aberto) {
    return (
      <Botao variante="secundario" className={pequeno} onClick={() => setAberto(true)}>
        Cancelar
      </Botao>
    )
  }

  function confirmar() {
    if (!motivo.trim()) {
      setErroMotivo('Informe o motivo.')
      return
    }
    cancelar.mutate({ id, motivo })
  }

  return (
    <div role="group" aria-label={`Cancelar recibo ${numero}`} className="w-72 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <Campo
        rotulo={`Motivo do cancelamento do ${numero}`}
        value={motivo}
        erro={erroMotivo}
        autoFocus
        onChange={(e) => {
          setMotivo(e.target.value)
          setErroMotivo('')
        }}
      />
      <p className="text-xs text-stone-600">O recibo fica no histórico. O recebimento poderá ganhar um recibo novo, com outro número.</p>
      {cancelar.error && <Alerta tipo="erro">{mensagemErroBanco(cancelar.error)}</Alerta>}
      <div className="flex gap-2">
        <Botao className={`${pequeno} bg-red-700! hover:bg-red-800!`} carregando={cancelar.isPending} onClick={confirmar}>
          Cancelar recibo
        </Botao>
        <Botao variante="secundario" className={pequeno} disabled={cancelar.isPending} onClick={() => setAberto(false)}>
          Voltar
        </Botao>
      </div>
    </div>
  )
}
