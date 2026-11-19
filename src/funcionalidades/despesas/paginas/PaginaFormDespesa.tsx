import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { AreaTexto } from '../../../componentes/ui/AreaTexto'
import { Botao } from '../../../componentes/ui/Botao'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { CancelarComMotivo } from '../../../componentes/ui/CancelarComMotivo'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selecao } from '../../../componentes/ui/Selecao'
import { formatarData, hojeISO } from '../../../lib/datas'
import { centavosDoBanco, centavosParaCampo, formatarReais } from '../../../lib/dinheiro'
import { mensagemErroBanco } from '../../../lib/erros'
import { useTrabalhos } from '../../trabalhos/consultas'
import { BaixarComprovante } from '../componentes/TabelaDespesas'
import { ErroComprovante, useCancelarDespesa, useDespesa, useSalvarDespesa, useTiposDespesa, type Despesa, type TipoDespesa } from '../consultas'
import { criarEsquemaDespesa, despesaParaBanco, type DadosDespesa } from '../esquemas'
import { ACEITA_COMPROVANTE, CLASSIFICACOES, ehClassificacao, problemaComprovante, type Classificacao } from '../rotulos'

/** Só caminhos internos ("/trabalhos/..."); nada de levar para outro site. */
function destinoSeguro(valor: string | null): string | null {
  return valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : null
}

export function PaginaFormDespesa() {
  const { id } = useParams()
  const [parametros] = useSearchParams()
  const location = useLocation()
  const trabalhoInicial = parametros.get('trabalho') ?? ''
  const voltarParam = destinoSeguro(parametros.get('voltar'))
  const voltar = voltarParam ?? (trabalhoInicial ? `/trabalhos/${trabalhoInicial}` : '/despesas')
  const avisoComprovante = (location.state as { avisoComprovante?: boolean } | null)?.avisoComprovante

  const despesa = useDespesa(id)
  const tipos = useTiposDespesa()
  const trabalhos = useTrabalhos()

  const cancelada = despesa.data?.status === 'cancelada'
  const titulo = !id ? 'Lançar despesa' : cancelada ? 'Despesa cancelada' : 'Editar despesa'
  const rotuloVoltar = voltar.startsWith('/trabalhos/') ? 'Trabalho' : 'Despesas'

  let conteudo: ReactNode
  if ((id && despesa.isPending) || tipos.isPending || trabalhos.isPending) {
    conteudo = <Carregando />
  } else if (despesa.error || tipos.error || trabalhos.error) {
    conteudo = <Alerta tipo="erro">Não foi possível carregar os dados da despesa.</Alerta>
  } else if (id && !despesa.data) {
    conteudo = <Alerta tipo="erro">Despesa não encontrada.</Alerta>
  } else if (despesa.data && cancelada) {
    conteudo = <ResumoCancelada despesa={despesa.data} />
  } else {
    conteudo = (
      <>
        {avisoComprovante && <Alerta tipo="erro">A despesa foi salva, mas o comprovante não foi enviado. Escolha o arquivo de novo e salve.</Alerta>}
        <Formulario
          key={despesa.data?.id ?? 'nova'}
          despesa={despesa.data ?? null}
          tipos={tipos.data ?? []}
          trabalhos={trabalhos.data ?? []}
          trabalhoInicial={trabalhoInicial}
          voltar={voltar}
          voltarExplicito={!!voltarParam || !!trabalhoInicial}
        />
        {despesa.data && <CancelarDespesa despesa={despesa.data} />}
      </>
    )
  }

  return (
    <>
      <CabecalhoPagina titulo={titulo} voltar={{ para: voltar, rotulo: rotuloVoltar }} />
      <div className="max-w-2xl space-y-5">{conteudo}</div>
    </>
  )
}

type LinhaTrabalho = NonNullable<ReturnType<typeof useTrabalhos>['data']>[number]

type PropsFormulario = {
  despesa: Despesa | null
  tipos: TipoDespesa[]
  trabalhos: LinhaTrabalho[]
  trabalhoInicial: string
  voltar: string
  /** Veio de um trabalho (ou de um link com destino): volta para lá depois de salvar. */
  voltarExplicito: boolean
}

function Formulario({ despesa, tipos, trabalhos, trabalhoInicial, voltar, voltarExplicito }: PropsFormulario) {
  const navigate = useNavigate()
  const salvar = useSalvarDespesa()
  const hoje = hojeISO()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroArquivo, setErroArquivo] = useState('')

  const classificacaoDe = useMemo(() => {
    const porId = new Map(tipos.map((t) => [t.id, t.classificacao]))
    return (tipoId: string): Classificacao | undefined => {
      const c = porId.get(tipoId)
      return ehClassificacao(c) ? c : undefined
    }
  }, [tipos])
  const esquema = useMemo(() => criarEsquemaDespesa({ hoje, classificacaoDe }), [hoje, classificacaoDe])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DadosDespesa>({
    resolver: zodResolver(esquema),
    defaultValues: despesa
      ? {
          tipo_despesa_id: despesa.tipo_despesa_id,
          trabalho_id: despesa.trabalho_id ?? '',
          data: despesa.data,
          valor: centavosParaCampo(centavosDoBanco(despesa.valor)),
          descricao: despesa.descricao ?? '',
          fornecedor: despesa.fornecedor ?? '',
        }
      : { tipo_despesa_id: '', trabalho_id: trabalhoInicial, data: hoje, valor: '', descricao: '', fornecedor: '' },
  })
  const tipoEscolhido = useWatch({ control, name: 'tipo_despesa_id' })
  const classificacao = classificacaoDe(tipoEscolhido)

  // Tipos ativos, mais o da própria despesa se ele tiver sido desativado depois.
  const opcoesTipo = tipos.filter((t) => t.ativo || t.id === despesa?.tipo_despesa_id)
  // Trabalhos não cancelados, mais o da própria despesa.
  const opcoesTrabalho = trabalhos.filter(
    (t) => t.trabalho_id && (t.status !== 'cancelado' || t.trabalho_id === despesa?.trabalho_id || t.trabalho_id === trabalhoInicial),
  )

  async function enviar(valores: DadosDespesa) {
    const c = classificacaoDe(valores.tipo_despesa_id)
    if (!c) return
    if (arquivo) {
      const problema = problemaComprovante(arquivo)
      if (problema) return setErroArquivo(problema)
    }
    const destino = voltarExplicito ? voltar : `/despesas?mes=${valores.data.slice(0, 7)}`
    try {
      await salvar.mutateAsync({ id: despesa?.id, despesa: despesaParaBanco(valores, c), comprovante: arquivo })
      navigate(destino)
    } catch (erro) {
      // Despesa nova salva sem o arquivo: segue para a edição dela, com o aviso.
      if (erro instanceof ErroComprovante && !despesa) {
        const busca = voltarExplicito ? `?voltar=${encodeURIComponent(voltar)}` : ''
        navigate(`/despesas/${erro.despesaId}${busca}`, { replace: true, state: { avisoComprovante: true } })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <div>
        <Selecao rotulo="Tipo de despesa" erro={errors.tipo_despesa_id?.message} {...register('tipo_despesa_id')}>
          <option value="" disabled>
            Escolha o tipo
          </option>
          {(Object.keys(CLASSIFICACOES) as Classificacao[]).map((c) => (
            <optgroup key={c} label={`${CLASSIFICACOES[c].plural} (${CLASSIFICACOES[c].explicacao})`}>
              {opcoesTipo
                .filter((t) => t.classificacao === c)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                    {t.ativo ? '' : ' (desativado)'}
                  </option>
                ))}
            </optgroup>
          ))}
        </Selecao>
        <p className="mt-1.5 text-xs text-stone-500">
          {classificacao === 'indireta'
            ? 'Indireta: custo do estúdio, sem trabalho.'
            : classificacao === 'direta'
              ? 'Direta: entra no resultado do trabalho escolhido.'
              : (
                <>
                  Falta um tipo? Cadastre em{' '}
                  <Link to="/despesas/tipos" className="underline underline-offset-4 hover:text-stone-800">
                    Tipos de despesa
                  </Link>
                  .
                </>
              )}
        </p>
      </div>

      {classificacao === 'direta' && (
        <Selecao rotulo="Trabalho" erro={errors.trabalho_id?.message} {...register('trabalho_id')}>
          <option value="">Escolha o trabalho</option>
          {opcoesTrabalho.map((t) => (
            <option key={t.trabalho_id} value={t.trabalho_id!}>
              {t.descricao} ({t.cliente_nome}){t.data_evento ? ` · ${formatarData(t.data_evento)}` : ''}
              {t.status === 'cancelado' ? ' · cancelado' : ''}
            </option>
          ))}
        </Selecao>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Data do pagamento" type="date" max={hoje} erro={errors.data?.message} {...register('data')} />
        <Campo rotulo="Valor (R$)" inputMode="decimal" autoComplete="off" placeholder="0,00" erro={errors.valor?.message} {...register('valor')} />
      </div>

      <Campo rotulo="Fornecedor (opcional)" placeholder="Ex.: Gráfica Iguaçu" maxLength={100} erro={errors.fornecedor?.message} {...register('fornecedor')} />

      <AreaTexto
        rotulo="Descrição (opcional)"
        rows={2}
        maxLength={200}
        dica="Ex.: álbum 30x30 com 40 páginas. Não guarde aqui dados pessoais nem bancários."
        erro={errors.descricao?.message}
        {...register('descricao')}
      />

      <div className="space-y-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
        {despesa?.comprovante && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-stone-700">
            <span>Comprovante anexado.</span>
            <BaixarComprovante caminho={despesa.comprovante} data={despesa.data} />
          </div>
        )}
        <label htmlFor="comprovante" className="block text-sm font-medium text-stone-700">
          {despesa?.comprovante ? 'Trocar comprovante (opcional)' : 'Comprovante (opcional)'}
        </label>
        <input
          id="comprovante"
          type="file"
          accept={ACEITA_COMPROVANTE}
          aria-invalid={!!erroArquivo}
          onChange={(e) => {
            const escolhido = e.target.files?.[0] ?? null
            setArquivo(escolhido)
            setErroArquivo(escolhido ? (problemaComprovante(escolhido) ?? '') : '')
          }}
          className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border file:border-stone-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <p className="text-xs text-stone-500">PDF ou foto (JPG, PNG, WEBP), até 10 MB.</p>
        {erroArquivo && <p className="text-sm text-red-700">{erroArquivo}</p>}
      </div>

      {salvar.error && (
        <Alerta tipo="erro">
          {salvar.error instanceof ErroComprovante ? salvar.error.message : mensagemErroBanco(salvar.error)}
        </Alerta>
      )}

      <div className="flex flex-wrap gap-2">
        <Botao type="submit" carregando={salvar.isPending}>
          {despesa ? 'Salvar alterações' : 'Lançar despesa'}
        </Botao>
        <BotaoLink para={voltar} variante="secundario">
          Voltar
        </BotaoLink>
      </div>
    </form>
  )
}

/** Depois de cancelada, a própria página passa a mostrar o resumo com o motivo. */
function CancelarDespesa({ despesa }: { despesa: Despesa }) {
  const cancelar = useCancelarDespesa()
  return (
    <section aria-labelledby="titulo-cancelar" className="space-y-2 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <h2 id="titulo-cancelar" className="text-base font-semibold text-stone-900">
        Cancelar despesa
      </h2>
      <p className="text-sm text-stone-600">
        Para despesa lançada por engano. Ela fica no histórico, mas sai dos totais e do resultado. Não dá para desfazer.
      </p>
      <CancelarComMotivo
        oQue="despesa"
        rotuloBotao="Cancelar despesa"
        aviso="Depois de cancelada, a despesa não pode ser editada."
        carregando={cancelar.isPending}
        erro={cancelar.error ? mensagemErroBanco(cancelar.error) : null}
        onConfirmar={(motivo) => cancelar.mutate({ id: despesa.id, motivo })}
      />
    </section>
  )
}

function ResumoCancelada({ despesa }: { despesa: Despesa }) {
  const classificacao = ehClassificacao(despesa.tipo?.classificacao) ? CLASSIFICACOES[despesa.tipo.classificacao] : null
  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <Alerta tipo="erro">
        Cancelada. Motivo: {despesa.motivo_cancelamento}. Ela não entra em nenhum total.
      </Alerta>
      <dl className="space-y-2 text-sm">
        <Dado rotulo="Tipo">
          {despesa.tipo?.nome}
          {classificacao && ` (${classificacao.rotulo.toLowerCase()})`}
        </Dado>
        {despesa.trabalho && (
          <Dado rotulo="Trabalho">
            <Link to={`/trabalhos/${despesa.trabalho.id}`} className="underline underline-offset-4">
              {despesa.trabalho.descricao}
            </Link>
          </Dado>
        )}
        <Dado rotulo="Data">{formatarData(despesa.data)}</Dado>
        <Dado rotulo="Valor">{formatarReais(centavosDoBanco(despesa.valor))}</Dado>
        <Dado rotulo="Fornecedor">{despesa.fornecedor || '—'}</Dado>
        <Dado rotulo="Descrição">{despesa.descricao || '—'}</Dado>
      </dl>
      {despesa.comprovante && <BaixarComprovante caminho={despesa.comprovante} data={despesa.data} />}
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
