import { Botao } from '../../../componentes/ui/Botao'
import type { LinhaRecebimento } from '../../recebimentos/consultas'
import { numeroRecibo } from '../conteudo'
import { useBaixarRecibo, useEmitirRecibo, useGerarPdfRecibo } from '../consultas'
import { mensagemErroRecibo } from '../emissao'

const pequeno = 'px-3! py-1.5!'

/** Recibo de um recebimento: baixar, gerar o PDF que faltou ou emitir. */
export function AcoesRecibo({ recebimento: r }: { recebimento: LinhaRecebimento }) {
  const emitir = useEmitirRecibo()
  const gerarPdf = useGerarPdfRecibo()
  const baixar = useBaixarRecibo()
  const erro = emitir.error ?? gerarPdf.error ?? baixar.error

  let acao
  if (r.status !== 'confirmado') {
    acao = <span className="text-stone-400">—</span>
  } else if (r.recibo_id && r.recibo_ano && r.recibo_numero) {
    const numero = numeroRecibo(r.recibo_ano, r.recibo_numero)
    acao = r.recibo_pdf ? (
      <Botao
        variante="secundario"
        className={pequeno}
        carregando={baixar.isPending}
        aria-label={`Baixar recibo ${numero}`}
        onClick={() => baixar.mutate({ caminho: r.recibo_pdf!, ano: r.recibo_ano!, numero: r.recibo_numero! })}
      >
        {numero}
      </Botao>
    ) : (
      <Botao
        variante="secundario"
        className={pequeno}
        carregando={gerarPdf.isPending}
        aria-label={`Gerar PDF do recibo ${numero}`}
        onClick={() => gerarPdf.mutate(r.recibo_id!)}
      >
        {numero}: gerar PDF
      </Botao>
    )
  } else {
    acao = (
      <Botao className={pequeno} carregando={emitir.isPending} onClick={() => emitir.mutate(r.id)}>
        Emitir recibo
      </Botao>
    )
  }

  return (
    <div className="space-y-1">
      {acao}
      {erro && (
        <p role="alert" className="max-w-56 text-xs text-red-700">
          {mensagemErroRecibo(erro)}
        </p>
      )}
    </div>
  )
}
