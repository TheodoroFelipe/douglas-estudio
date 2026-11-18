import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { LinkEmissorNfse } from '../../../componentes/ui/LinkEmissorNfse'
import { Selecao } from '../../../componentes/ui/Selecao'
import { hojeISO } from '../../../lib/datas'
import { centavosDeTexto, centavosDoBanco, centavosParaCampo, formatarReais } from '../../../lib/dinheiro'
import { soDigitos } from '../../../lib/documentos'
import { mensagemErroBanco } from '../../../lib/erros'
import { useConfiguracoes } from '../../configuracoes/consultas'
import { configuracoesParaFormulario, type Configuracoes } from '../../configuracoes/esquemas'
import { useAlterarStatusTrabalho, useTrabalho } from '../../trabalhos/consultas'
import { decodificarChave, formatarChave } from '../chave'
import { ErroArquivoNota, useNotasDoTrabalho, useNotasPendentes, useRegistrarNota } from '../consultas'
import { extrairLinhasPdf, lerDanfse, pareceDanfse, type DadosDanfse } from '../danfse'
import { criarEsquemaNota, notaParaBanco, type DadosNota } from '../esquemas'

export function PaginaNovaNota() {
  const [parametros, setParametros] = useSearchParams()
  const trabalhoId = parametros.get('trabalho') ?? ''
  const substitui = parametros.get('substitui') ?? ''

  return (
    <>
      <CabecalhoPagina
        titulo={substitui ? 'Substituir nota fiscal' : 'Registrar nota fiscal'}
        subtitulo="A NFS-e é emitida no Emissor Nacional; aqui você registra a nota já emitida, com o PDF."
        acoes={<LinkEmissorNfse />}
        voltar={trabalhoId ? { para: `/trabalhos/${trabalhoId}`, rotulo: 'Trabalho' } : { para: '/notas', rotulo: 'Notas fiscais' }}
      />
      <div className="max-w-3xl space-y-5">
        {!trabalhoId ? (
          <EscolherTrabalho onEscolher={(id) => setParametros({ trabalho: id }, { replace: true })} />
        ) : (
          <Carregador key={trabalhoId} trabalhoId={trabalhoId} substitui={substitui} />
        )}
      </div>
    </>
  )
}

function EscolherTrabalho({ onEscolher }: { onEscolher: (id: string) => void }) {
  const { data, isPending, error } = useNotasPendentes()
  if (isPending) return <Carregando />
  if (error) return <Alerta tipo="erro">Não foi possível carregar os trabalhos.</Alerta>
  if (data.length === 0) {
    return <Alerta>Nenhum trabalho concluído sem nota. A nota é registrada depois de concluir o trabalho, na página dele.</Alerta>
  }
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <Selecao rotulo="Trabalho concluído sem nota" defaultValue="" onChange={(e) => e.target.value && onEscolher(e.target.value)}>
        <option value="" disabled>
          Escolha o trabalho
        </option>
        {data.map((t) => (
          <option key={t.trabalho_id} value={t.trabalho_id!}>
            {t.descricao} ({t.cliente_nome}) · {formatarReais(centavosDoBanco(t.valor_total))}
          </option>
        ))}
      </Selecao>
    </div>
  )
}

function Carregador({ trabalhoId, substitui }: { trabalhoId: string; substitui: string }) {
  const trabalho = useTrabalho(trabalhoId)
  const notas = useNotasDoTrabalho(trabalhoId)
  const config = useConfiguracoes()
  const alterarStatus = useAlterarStatusTrabalho()

  if (trabalho.isPending || notas.isPending || config.isPending) return <Carregando />
  if (trabalho.error || notas.error || config.error || !trabalho.data) {
    return <Alerta tipo="erro">{trabalho.data === null ? 'Trabalho não encontrado.' : 'Não foi possível carregar o trabalho.'}</Alerta>
  }

  const t = trabalho.data.trabalho
  const ativa = notas.data.find((n) => n.status === 'emitida')
  const cabecalho = (
    <div className="text-sm">
      <Link to={`/trabalhos/${t.id}`} className="font-medium text-stone-900 underline-offset-4 hover:underline">
        {t.descricao}
      </Link>
      <p className="text-stone-600">
        {t.cliente?.nome} · total {formatarReais(centavosDoBanco(t.valor_total))}
      </p>
    </div>
  )

  if (substitui && ativa?.id !== substitui) {
    return <Alerta tipo="erro">A nota a substituir não é a nota ativa deste trabalho.</Alerta>
  }
  if (!substitui && ativa) {
    return (
      <Alerta>
        Este trabalho já tem a nota {ativa.numero} emitida. Para trocar, use “Substituir” ou cancele a nota antes, na{' '}
        <Link to={`/trabalhos/${t.id}`} className="font-medium underline underline-offset-4">página do trabalho</Link>.
      </Alerta>
    )
  }
  if (t.status !== 'concluido') {
    return (
      <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
        {cabecalho}
        <Alerta>A nota fiscal é registrada quando o trabalho é concluído (a NFS-e sai na conclusão, com o valor total).</Alerta>
        {t.status === 'cancelado' ? (
          <Alerta tipo="erro">Trabalho cancelado não recebe nota fiscal.</Alerta>
        ) : (
          <Botao carregando={alterarStatus.isPending} onClick={() => alterarStatus.mutate({ id: t.id, status: 'concluido' })}>
            Concluir o trabalho agora
          </Botao>
        )}
        {alterarStatus.error && <Alerta tipo="erro">{mensagemErroBanco(alterarStatus.error)}</Alerta>}
      </div>
    )
  }

  return (
    <Formulario
      cabecalho={cabecalho}
      trabalho={{
        id: t.id,
        totalCentavos: centavosDoBanco(t.valor_total),
        dataConclusao: t.data_conclusao,
        clienteDocumento: t.cliente?.cpf_cnpj ?? null,
      }}
      config={config.data}
      substituida={ativa && substitui ? { id: ativa.id, numero: ativa.numero } : null}
    />
  )
}

type PropsFormulario = {
  cabecalho: ReactNode
  trabalho: { id: string; totalCentavos: number; dataConclusao: string | null; clienteDocumento: string | null }
  config: Configuracoes
  substituida: { id: string; numero: string } | null
}

function Formulario({ cabecalho, trabalho, config, substituida }: PropsFormulario) {
  const navigate = useNavigate()
  const registrar = useRegistrarNota()
  const hoje = hojeISO()
  const esquema = useMemo(() => criarEsquemaNota({ hoje, cnpjEstudio: config.cnpj }), [hoje, config.cnpj])
  const padroes = configuracoesParaFormulario(config)

  const [pdf, setPdf] = useState<File | null>(null)
  const [xml, setXml] = useState<File | null>(null)
  const [erroPdf, setErroPdf] = useState('')
  const [lendo, setLendo] = useState(false)
  const [lido, setLido] = useState<DadosDanfse | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<DadosNota>({
    resolver: zodResolver(esquema),
    defaultValues: {
      numero: '',
      chave_acesso: '',
      data_emissao: hoje,
      data_competencia: trabalho.dataConclusao ?? hoje,
      valor_servico: centavosParaCampo(trabalho.totalCentavos),
      codigo_servico: padroes.codigo_servico_padrao,
      descricao_servico: padroes.descricao_servico_padrao,
      aliquota_iss: padroes.aliquota_iss_padrao,
    },
  })
  const [valor, chave, dataEmissao] = useWatch({ control, name: ['valor_servico', 'chave_acesso', 'data_emissao'] })

  async function escolherPdf(arquivo: File | undefined) {
    setErroPdf('')
    setLido(null)
    setPdf(null)
    if (!arquivo) return
    if (arquivo.type !== 'application/pdf') return setErroPdf('Escolha o PDF da nota (DANFSe).')
    if (arquivo.size > 10 * 1024 * 1024) return setErroPdf('O PDF pode ter no máximo 10 MB.')
    setPdf(arquivo)
    setLendo(true)
    try {
      const linhas = await extrairLinhasPdf(arquivo)
      if (!pareceDanfse(linhas)) {
        setErroPdf('Não reconheci este PDF como uma NFS-e do Emissor Nacional. Preencha os campos à mão.')
        return
      }
      const d = lerDanfse(linhas)
      const opcoes = { shouldValidate: true, shouldDirty: true }
      if (d.numero) setValue('numero', d.numero, opcoes)
      if (d.chave) setValue('chave_acesso', formatarChave(d.chave), opcoes)
      if (d.dataEmissao) setValue('data_emissao', d.dataEmissao, opcoes)
      if (d.dataCompetencia) setValue('data_competencia', d.dataCompetencia, opcoes)
      if (d.valorCentavos) setValue('valor_servico', centavosParaCampo(d.valorCentavos), opcoes)
      if (d.codigoServico) setValue('codigo_servico', d.codigoServico, opcoes)
      if (d.descricaoServico) setValue('descricao_servico', d.descricaoServico, opcoes)
      setValue('aliquota_iss', d.aliquotaCentesimos === null ? '' : centavosParaCampo(d.aliquotaCentesimos), opcoes)
      setLido(d)
    } catch (erro) {
      console.error(erro)
      setErroPdf('Não consegui ler o texto deste PDF. Preencha os campos à mão.')
    } finally {
      setLendo(false)
    }
  }

  // Avisos que não impedem o registro.
  const avisos: string[] = []
  const valorCentavos = centavosDeTexto(valor)
  if (valorCentavos !== null && valorCentavos !== trabalho.totalCentavos) {
    avisos.push(`O valor é diferente do total do trabalho (${formatarReais(trabalho.totalCentavos)}). A nota vai aparecer como divergente.`)
  }
  const decodificada = decodificarChave(chave)
  if (decodificada && dataEmissao && decodificada.mesEmissao !== dataEmissao.slice(0, 7)) {
    avisos.push('O mês da data de emissão não confere com o mês que está na chave de acesso.')
  }
  if (lido?.situacao && lido.situacao !== 'NFS-e Gerada') avisos.push(`A situação no PDF é “${lido.situacao}”.`)
  if (lido?.tipoAmbiente === '2') avisos.push('Este PDF é de uma nota de teste (ambiente de homologação), sem valor fiscal.')
  if (lido?.tomadorDocumento && trabalho.clienteDocumento && soDigitos(lido.tomadorDocumento) !== trabalho.clienteDocumento) {
    avisos.push(`O tomador da nota (${lido.tomadorNome ?? 'outro documento'}) não é o cliente cadastrado neste trabalho.`)
  }

  async function enviar(dados: DadosNota) {
    if (!pdf) return setErroPdf('Anexe o PDF da nota.')
    await registrar.mutateAsync({ nota: notaParaBanco(trabalho.id, dados, substituida?.id ?? null), pdf, xml })
    navigate(`/trabalhos/${trabalho.id}`)
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      {cabecalho}
      {substituida && <Alerta>A nota {substituida.numero} vai ficar como substituída, no histórico.</Alerta>}

      <div className="space-y-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
        <div>
          <label htmlFor="pdf-nota" className="mb-1.5 block text-sm font-medium text-stone-700">
            PDF da nota (DANFSe)
          </label>
          <input
            id="pdf-nota"
            type="file"
            accept="application/pdf"
            onChange={(e) => escolherPdf(e.target.files?.[0])}
            className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border file:border-stone-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          <p className="mt-1.5 text-xs text-stone-500">Os campos abaixo são preenchidos com o que estiver no PDF. Confira antes de salvar.</p>
        </div>
        <div>
          <label htmlFor="xml-nota" className="mb-1.5 block text-sm font-medium text-stone-700">
            XML da nota (opcional)
          </label>
          <input
            id="xml-nota"
            type="file"
            accept=".xml,application/xml,text/xml"
            onChange={(e) => setXml(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border file:border-stone-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium"
          />
        </div>
        {lendo && <p className="text-sm text-stone-600">Lendo o PDF…</p>}
        {lido && <Alerta tipo="sucesso">Dados lidos do PDF: nota {lido.numero}, {lido.valorCentavos ? formatarReais(lido.valorCentavos) : 'sem valor'}.</Alerta>}
        {erroPdf && <Alerta tipo="erro">{erroPdf}</Alerta>}
      </div>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Campo rotulo="Número" inputMode="numeric" erro={errors.numero?.message} {...register('numero')} />
        <Campo rotulo="Chave de acesso" inputMode="numeric" autoComplete="off" erro={errors.chave_acesso?.message} {...register('chave_acesso')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Data de emissão" type="date" max={hoje} erro={errors.data_emissao?.message} {...register('data_emissao')} />
        <Campo rotulo="Competência" type="date" erro={errors.data_competencia?.message} {...register('data_competencia')} />
        <Campo rotulo="Valor do serviço (R$)" inputMode="decimal" erro={errors.valor_servico?.message} {...register('valor_servico')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[9rem_1fr_8rem]">
        <Campo rotulo="Código do serviço" erro={errors.codigo_servico?.message} {...register('codigo_servico')} />
        <Campo rotulo="Descrição do serviço" erro={errors.descricao_servico?.message} {...register('descricao_servico')} />
        <Campo rotulo="Alíquota ISS (%)" inputMode="decimal" placeholder="—" erro={errors.aliquota_iss?.message} {...register('aliquota_iss')} />
      </div>

      {avisos.length > 0 && (
        <Alerta>
          <ul className="list-disc space-y-1 pl-4">
            {avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </Alerta>
      )}

      {registrar.error && (
        <Alerta tipo="erro">
          {registrar.error instanceof ErroArquivoNota ? (
            <>
              {registrar.error.message}{' '}
              <Link to={`/trabalhos/${trabalho.id}`} className="font-medium underline underline-offset-4">
                Ir para o trabalho
              </Link>
            </>
          ) : (
            mensagemErroBanco(registrar.error, {
              unico: {
                notas_fiscais_uma_ativa_por_trabalho: 'Este trabalho já tem uma nota emitida.',
                notas_fiscais_chave_acesso_key: 'Esta chave de acesso já foi registrada em outra nota.',
              },
            })
          )}
        </Alerta>
      )}

      <div className="flex flex-wrap gap-2">
        <Botao type="submit" carregando={registrar.isPending} disabled={lendo}>
          {substituida ? 'Registrar nota substituta' : 'Registrar nota'}
        </Botao>
        <BotaoLink para={`/trabalhos/${trabalho.id}`} variante="secundario">
          Cancelar
        </BotaoLink>
      </div>
    </form>
  )
}
