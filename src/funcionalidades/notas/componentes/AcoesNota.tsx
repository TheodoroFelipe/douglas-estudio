import { useRef } from 'react'
import { Botao } from '../../../componentes/ui/Botao'
import { BotaoLink } from '../../../componentes/ui/CabecalhoPagina'
import { CancelarComMotivo } from '../../../componentes/ui/CancelarComMotivo'
import { mensagemErroBanco } from '../../../lib/erros'
import { useAnexarArquivoNota, useBaixarArquivoNota, useCancelarNota, type Nota } from '../consultas'
import { nomeArquivoNota } from '../esquemas'

const pequeno = 'px-3! py-1.5!'

/** Arquivos (baixar ou anexar) e, para a nota emitida, cancelar e substituir. */
export function AcoesNota({ nota }: { nota: Nota }) {
  const baixar = useBaixarArquivoNota()
  const anexar = useAnexarArquivoNota()
  const cancelar = useCancelarNota()
  const emitida = nota.status === 'emitida'
  const erro = baixar.error ?? anexar.error

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-2">
        {nota.arquivo_pdf ? (
          <Botao
            variante="secundario"
            className={pequeno}
            carregando={baixar.isPending && baixar.variables?.caminho === nota.arquivo_pdf}
            aria-label={`Baixar PDF da nota ${nota.numero}`}
            onClick={() => baixar.mutate({ caminho: nota.arquivo_pdf!, nome: nomeArquivoNota(nota.numero, 'pdf') })}
          >
            PDF
          </Botao>
        ) : (
          emitida && (
            <Anexar rotulo="Anexar PDF" aceita="application/pdf" carregando={anexar.isPending} onArquivo={(arquivo) => anexar.mutate({ notaId: nota.id, tipo: 'pdf', arquivo })} />
          )
        )}
        {nota.arquivo_xml ? (
          <Botao
            variante="secundario"
            className={pequeno}
            carregando={baixar.isPending && baixar.variables?.caminho === nota.arquivo_xml}
            aria-label={`Baixar XML da nota ${nota.numero}`}
            onClick={() => baixar.mutate({ caminho: nota.arquivo_xml!, nome: nomeArquivoNota(nota.numero, 'xml') })}
          >
            XML
          </Botao>
        ) : (
          emitida && (
            <Anexar rotulo="Anexar XML" aceita=".xml,application/xml,text/xml" carregando={anexar.isPending} onArquivo={(arquivo) => anexar.mutate({ notaId: nota.id, tipo: 'xml', arquivo })} />
          )
        )}
        {emitida && (
          <>
            <BotaoLink para={`/notas/nova?trabalho=${nota.trabalho_id}&substitui=${nota.id}`} variante="secundario" className={pequeno}>
              Substituir
            </BotaoLink>
            <CancelarComMotivo
              oQue={`nota ${nota.numero}`}
              aviso="Cancele aqui depois de cancelar no Emissor Nacional. A nota fica no histórico e o trabalho volta a ficar com nota pendente."
              carregando={cancelar.isPending}
              erro={cancelar.error ? mensagemErroBanco(cancelar.error) : null}
              onConfirmar={(motivo) => cancelar.mutate({ id: nota.id, motivo })}
            />
          </>
        )}
      </div>
      {erro && (
        <p role="alert" className="max-w-64 text-xs text-red-700">
          {anexar.error ? 'Não foi possível enviar o arquivo. Tente de novo.' : 'Não foi possível baixar o arquivo. Tente de novo.'}
        </p>
      )}
    </div>
  )
}

function Anexar({ rotulo, aceita, carregando, onArquivo }: { rotulo: string; aceita: string; carregando: boolean; onArquivo: (arquivo: File) => void }) {
  const entrada = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept={aceita}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const arquivo = e.target.files?.[0]
          if (arquivo) onArquivo(arquivo)
          e.target.value = ''
        }}
      />
      <Botao variante="secundario" className={pequeno} carregando={carregando} onClick={() => entrada.current?.click()}>
        {rotulo}
      </Botao>
    </>
  )
}
