import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { AreaTexto } from '../../../componentes/ui/AreaTexto'
import { Botao } from '../../../componentes/ui/Botao'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selecao } from '../../../componentes/ui/Selecao'
import { formatarData, hojeISO } from '../../../lib/datas'
import { centavosDoBanco, centavosParaCampo, formatarReais } from '../../../lib/dinheiro'
import { mensagemErroBanco } from '../../../lib/erros'
import { useEmitirRecibo } from '../../recibos/consultas'
import { ErroPdfRecibo, mensagemErroRecibo } from '../../recibos/emissao'
import { useTrabalho, useTrabalhos } from '../../trabalhos/consultas'
import { rotuloParcela } from '../../trabalhos/plano'
import { useRegistrarRecebimento } from '../consultas'
import { criarEsquemaRecebimento, recebimentoParaBanco, type DadosRecebimento } from '../esquemas'
import { FORMAS_COM_TAXA, FORMAS_PAGAMENTO } from '../rotulos'

export function PaginaNovoRecebimento() {
  const [parametros, setParametros] = useSearchParams()
  const trabalhoId = parametros.get('trabalho') ?? ''
  const parcelaId = parametros.get('parcela') ?? ''

  return (
    <>
      <CabecalhoPagina
        titulo="Registrar recebimento"
        voltar={trabalhoId ? { para: `/trabalhos/${trabalhoId}`, rotulo: 'Trabalho' } : { para: '/recebimentos', rotulo: 'Recebimentos' }}
      />
      <div className="max-w-2xl space-y-5">
        {!trabalhoId ? (
          <EscolherTrabalho onEscolher={(id) => setParametros({ trabalho: id }, { replace: true })} />
        ) : (
          <Formulario key={`${trabalhoId}-${parcelaId}`} trabalhoId={trabalhoId} parcelaInicial={parcelaId} />
        )}
      </div>
    </>
  )
}

function EscolherTrabalho({ onEscolher }: { onEscolher: (id: string) => void }) {
  const { data, isPending, error } = useTrabalhos()
  if (isPending) return <Carregando />
  if (error) return <Alerta tipo="erro">Não foi possível carregar os trabalhos.</Alerta>

  const abertos = data
    .filter((t) => t.status !== 'cancelado' && centavosDoBanco(t.saldo_a_receber) > 0)
    .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
  if (abertos.length === 0) return <Alerta>Nenhum trabalho com valor a receber.</Alerta>

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <Selecao rotulo="Trabalho" defaultValue="" onChange={(e) => e.target.value && onEscolher(e.target.value)}>
        <option value="" disabled>
          Escolha o trabalho
        </option>
        {abertos.map((t) => (
          <option key={t.trabalho_id} value={t.trabalho_id}>
            {t.descricao} ({t.cliente_nome}) · a receber {formatarReais(centavosDoBanco(t.saldo_a_receber))}
          </option>
        ))}
      </Selecao>
    </div>
  )
}

function Formulario({ trabalhoId, parcelaInicial }: { trabalhoId: string; parcelaInicial: string }) {
  const { data, isPending, error } = useTrabalho(trabalhoId)
  const [registrado, setRegistrado] = useState<{ id: string; valorCentavos: number } | null>(null)
  // A cada novo lançamento o formulário recomeça com os saldos atualizados.
  const [rodada, setRodada] = useState(0)

  if (isPending) return <Carregando />
  if (error || !data) return <Alerta tipo="erro">{error ? 'Não foi possível carregar o trabalho.' : 'Trabalho não encontrado.'}</Alerta>
  if (registrado) {
    return (
      <Registrado
        {...registrado}
        trabalhoId={trabalhoId}
        onOutro={() => {
          setRegistrado(null)
          setRodada((n) => n + 1)
        }}
      />
    )
  }
  return (
    <FormularioCarregado
      key={rodada}
      dados={data}
      parcelaInicial={rodada === 0 ? parcelaInicial : ''}
      onRegistrado={setRegistrado}
    />
  )
}

type DadosTrabalho = NonNullable<ReturnType<typeof useTrabalho>['data']>

type PropsFormulario = {
  dados: DadosTrabalho
  parcelaInicial: string
  onRegistrado: (registro: { id: string; valorCentavos: number }) => void
}

function FormularioCarregado({ dados, parcelaInicial, onRegistrado }: PropsFormulario) {
  const { trabalho, resumo, parcelas } = dados
  const registrar = useRegistrarRecebimento()

  const hoje = hojeISO()
  const saldoTrabalho = centavosDoBanco(resumo?.saldo_a_receber)
  const totalParcelas = parcelas.filter((p) => p.numero > 0).length
  const abertas = useMemo(() => parcelas.filter((p) => centavosDoBanco(p.saldo) > 0), [parcelas])
  const saldos = useMemo(() => new Map(abertas.map((p) => [p.id, centavosDoBanco(p.saldo)])), [abertas])
  const saldoDe = (id: string) => saldos.get(id)

  const esquema = useMemo(
    () => criarEsquemaRecebimento({ hoje, saldoTrabalho, saldoParcela: (id) => saldos.get(id) }),
    [hoje, saldoTrabalho, saldos],
  )

  const parcelaPadrao = abertas.some((p) => p.id === parcelaInicial) ? parcelaInicial : (abertas[0]?.id ?? '')
  const saldoPadrao = parcelaPadrao ? saldoDe(parcelaPadrao) : undefined

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<DadosRecebimento>({
    resolver: zodResolver(esquema),
    defaultValues: {
      parcela_id: parcelaPadrao,
      data_recebimento: hoje,
      valor: saldoPadrao !== undefined ? centavosParaCampo(Math.min(saldoPadrao, saldoTrabalho)) : '',
      forma_pagamento: '',
      taxa: '',
      observacoes: '',
    },
  })
  const forma = useWatch({ control, name: 'forma_pagamento' })

  if (trabalho.status === 'cancelado') return <Alerta tipo="erro">Trabalho cancelado não aceita recebimentos.</Alerta>
  if (saldoTrabalho <= 0) return <Alerta>Este trabalho já foi todo recebido.</Alerta>

  async function enviar(valores: DadosRecebimento) {
    const salvo = await registrar.mutateAsync(recebimentoParaBanco(trabalho.id, valores))
    onRegistrado({ id: salvo.id, valorCentavos: centavosDoBanco(salvo.valor) })
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <div className="text-sm">
        <p className="font-medium text-stone-900">
          <Link to={`/trabalhos/${trabalho.id}`} className="underline-offset-4 hover:underline">
            {trabalho.descricao}
          </Link>
        </p>
        <p className="text-stone-600">
          {trabalho.cliente?.nome} · a receber {formatarReais(saldoTrabalho)}
        </p>
      </div>

      <Selecao
        rotulo="Parcela"
        erro={errors.parcela_id?.message}
        {...register('parcela_id', {
          onChange: (e) => {
            const saldo = saldoDe(e.target.value)
            if (saldo !== undefined) setValue('valor', centavosParaCampo(Math.min(saldo, saldoTrabalho)))
          },
        })}
      >
        {abertas.map((p) => (
          <option key={p.id} value={p.id}>
            {rotuloParcela(p.numero, totalParcelas)} · saldo {formatarReais(centavosDoBanco(p.saldo))} · vence {formatarData(p.vencimento)}
          </option>
        ))}
        <option value="">Sem parcela (pagamento avulso)</option>
      </Selecao>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Data do pagamento" type="date" max={hoje} erro={errors.data_recebimento?.message} {...register('data_recebimento')} />
        <Campo rotulo="Valor (R$)" inputMode="decimal" autoComplete="off" erro={errors.valor?.message} {...register('valor')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Selecao rotulo="Forma de pagamento" erro={errors.forma_pagamento?.message} {...register('forma_pagamento')}>
          <option value="" disabled>
            Escolha
          </option>
          {Object.entries(FORMAS_PAGAMENTO).map(([valor, { rotulo }]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Selecao>
        {FORMAS_COM_TAXA.includes(forma) && (
          <div>
            <Campo rotulo="Taxa da maquininha (R$)" inputMode="decimal" autoComplete="off" placeholder="0,00" erro={errors.taxa?.message} {...register('taxa')} />
            <p className="mt-1.5 text-xs text-stone-500">Entra como despesa direta do trabalho.</p>
          </div>
        )}
      </div>

      <AreaTexto
        rotulo="Observações"
        rows={2}
        dica="Não aparece no recibo. Não guarde aqui dados pessoais nem bancários."
        {...register('observacoes')}
      />

      {registrar.error && <Alerta tipo="erro">{mensagemErroBanco(registrar.error)}</Alerta>}

      <div className="flex flex-wrap gap-2">
        <Botao type="submit" carregando={registrar.isPending}>
          Registrar recebimento
        </Botao>
        <BotaoLink para={`/trabalhos/${trabalho.id}`} variante="secundario">
          Cancelar
        </BotaoLink>
      </div>
    </form>
  )
}

function Registrado({ id, valorCentavos, trabalhoId, onOutro }: { id: string; valorCentavos: number; trabalhoId: string; onOutro: () => void }) {
  const emitir = useEmitirRecibo()

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <Alerta tipo="sucesso">Recebimento de {formatarReais(valorCentavos)} registrado.</Alerta>

      {emitir.isSuccess ? (
        <Alerta tipo="sucesso">Recibo {emitir.data.numero} emitido. O PDF foi baixado e ficou guardado no sistema.</Alerta>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-stone-700">Quer emitir o recibo agora? O número sai na sequência do ano e o PDF é baixado.</p>
          {emitir.error && <Alerta tipo="erro">{mensagemErroRecibo(emitir.error)}</Alerta>}
          {!(emitir.error instanceof ErroPdfRecibo) && (
            <Botao carregando={emitir.isPending} onClick={() => emitir.mutate(id)}>
              Emitir recibo agora
            </Botao>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-4">
        <BotaoLink para={`/trabalhos/${trabalhoId}`} variante="secundario">
          Voltar ao trabalho
        </BotaoLink>
        <Botao variante="secundario" onClick={onOutro}>
          Registrar outro recebimento
        </Botao>
      </div>
    </div>
  )
}
