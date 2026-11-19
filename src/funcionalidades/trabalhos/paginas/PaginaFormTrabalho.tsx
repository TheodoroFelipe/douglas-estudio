import { useEffect } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Carregando } from '../../../componentes/ui/Carregando'
import { centavosDoBanco, centavosParaCampo } from '../../../lib/dinheiro'
import { FormularioTrabalho } from '../componentes/FormularioTrabalho'
import { useTrabalho } from '../consultas'
import { planoParaLinhas, type DadosTrabalho } from '../esquemas'

export function PaginaNovoTrabalho() {
  const [parametros] = useSearchParams()
  const valores: DadosTrabalho = {
    cliente_id: parametros.get('cliente') ?? '',
    tipo: '',
    descricao: '',
    data_evento: '',
    hora_evento: '',
    local_evento: '',
    valor_total: '',
    numero_contrato: '',
    parcelas: [],
  }
  return (
    <>
      <CabecalhoPagina titulo="Novo trabalho" voltar={{ para: '/trabalhos', rotulo: 'Trabalhos' }} />
      <div className="max-w-3xl">
        <FormularioTrabalho valoresIniciais={valores} />
      </div>
    </>
  )
}

export function PaginaEditarTrabalho() {
  const { id } = useParams()
  const { hash } = useLocation()
  const { data, isPending, error } = useTrabalho(id)
  const carregado = !!data

  // "Editar parcelas" (no detalhe do trabalho) abre direto no plano de parcelas.
  useEffect(() => {
    if (carregado && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [carregado, hash])

  if (isPending) return <Carregando />
  if (error || !data) {
    return (
      <>
        <CabecalhoPagina titulo="Editar trabalho" voltar={{ para: '/trabalhos', rotulo: 'Trabalhos' }} />
        <Alerta tipo="erro">{error ? 'Não foi possível carregar o trabalho.' : 'Trabalho não encontrado.'}</Alerta>
      </>
    )
  }

  const { trabalho, parcelas } = data
  const valores: DadosTrabalho = {
    cliente_id: trabalho.cliente_id,
    tipo: trabalho.tipo,
    descricao: trabalho.descricao,
    data_evento: trabalho.data_evento ?? '',
    hora_evento: trabalho.hora_evento?.slice(0, 5) ?? '',
    local_evento: trabalho.local_evento ?? '',
    valor_total: centavosParaCampo(centavosDoBanco(trabalho.valor_total)),
    numero_contrato: trabalho.numero_contrato ?? '',
    parcelas: planoParaLinhas(
      parcelas.map((p) => ({
        id: p.id,
        numero: p.numero,
        valorCentavos: centavosDoBanco(p.valor),
        vencimento: p.vencimento,
        pagoCentavos: centavosDoBanco(p.valor_pago),
      })),
    ),
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Editar trabalho"
        subtitulo={trabalho.descricao}
        voltar={{ para: `/trabalhos/${trabalho.id}`, rotulo: 'Voltar ao trabalho' }}
      />
      <div className="max-w-3xl">
        <FormularioTrabalho key={trabalho.id} id={trabalho.id} valoresIniciais={valores} />
      </div>
    </>
  )
}
