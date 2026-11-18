import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch, type Control, type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { Campo } from '../../../componentes/ui/Campo'
import { Selecao } from '../../../componentes/ui/Selecao'
import { hojeISO, somarMeses } from '../../../lib/datas'
import { centavosDeTexto, centavosParaCampo, formatarReais } from '../../../lib/dinheiro'
import { mensagemErroBanco } from '../../../lib/erros'
import { useClientes } from '../../clientes/consultas'
import { useSalvarTrabalho } from '../consultas'
import { esquemaTrabalho, linhasParaPlano, planoParaLinhas, type DadosTrabalho, type LinhaParcela } from '../esquemas'
import { gerarPlano } from '../plano'
import { NovoTipoInline } from '../../tipos-trabalho/componentes/NovoTipoInline'
import { useTiposTrabalho } from '../../tipos-trabalho/consultas'

type Props = {
  id?: string
  valoresIniciais: DadosTrabalho
}

export function FormularioTrabalho({ id, valoresIniciais }: Props) {
  const navigate = useNavigate()
  const salvar = useSalvarTrabalho()
  const clientes = useClientes()
  const tipos = useTiposTrabalho()
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<DadosTrabalho>({ resolver: zodResolver(esquemaTrabalho), defaultValues: valoresIniciais })
  const parcelas = useFieldArray({ control, name: 'parcelas', keyName: 'chave' })

  async function enviar(dados: DadosTrabalho) {
    try {
      const trabalhoId = await salvar.mutateAsync({
        id,
        cliente_id: dados.cliente_id,
        tipo: dados.tipo,
        descricao: dados.descricao,
        data_evento: dados.data_evento,
        hora_evento: dados.hora_evento,
        local_evento: dados.local_evento,
        valor_total_centavos: centavosDeTexto(dados.valor_total)!,
        numero_contrato: dados.numero_contrato,
        parcelas: linhasParaPlano(dados.parcelas),
      })
      navigate(`/trabalhos/${trabalhoId}`, { replace: true })
    } catch {
      // O erro aparece pelo estado da mutation.
    }
  }

  function aplicarPlano(novas: LinhaParcela[]) {
    // Num trabalho que já existe, aproveita as parcelas atuais pela posição
    // (mantém o vínculo com o que já foi recebido).
    const atuais = getValues('parcelas')
    parcelas.replace(
      novas.map((linha, i) => ({
        ...linha,
        parcelaId: atuais[i]?.parcelaId,
        pagoCentavos: atuais[i]?.pagoCentavos ?? 0,
      })),
    )
  }

  const errosParcelas = errors.parcelas?.root?.message ?? errors.parcelas?.message

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-8">
      <section className="space-y-5 rounded-xl border border-stone-200 bg-white p-4 sm:p-6" aria-labelledby="titulo-dados">
        <h2 id="titulo-dados" className="text-base font-semibold text-stone-900">
          Dados do trabalho
        </h2>

        <div>
          {/* Só registra o select depois que as opções chegam; antes disso o valor inicial
              (ex.: ?cliente=... vindo da tela do cliente) se perderia. */}
          {clientes.isPending ? (
            <Selecao rotulo="Cliente" disabled>
              <option>Carregando…</option>
            </Selecao>
          ) : (
            <Selecao rotulo="Cliente" erro={errors.cliente_id?.message} {...register('cliente_id')}>
              <option value="">Escolha o cliente</option>
              {clientes.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Selecao>
          )}
          {!id && (
            <Link to="/clientes/novo" className="mt-1.5 inline-block text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900">
              Cadastrar cliente novo
            </Link>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            {/* Só aparece depois de carregar os tipos, para o valor salvo ficar selecionado. */}
            {tipos.data ? (
              <Selecao rotulo="Tipo" erro={errors.tipo?.message} {...register('tipo')}>
                <option value="" disabled>
                  Escolha o tipo
                </option>
                {tipos.data
                  .filter((t) => t.ativo || t.chave === valoresIniciais.tipo)
                  .map((t) => (
                    <option key={t.chave} value={t.chave}>
                      {t.nome}
                      {!t.ativo && ' (desativado)'}
                    </option>
                  ))}
              </Selecao>
            ) : (
              <Campo rotulo="Tipo" value={tipos.error ? 'Não foi possível carregar os tipos' : 'Carregando…'} disabled readOnly />
            )}
            <NovoTipoInline onCriado={(tipo) => setValue('tipo', tipo.chave, { shouldValidate: true, shouldDirty: true })} />
          </div>
          <div className="grid grid-cols-[1fr_7.5rem] gap-3">
            <Campo rotulo="Data do evento" type="date" erro={errors.data_evento?.message} {...register('data_evento')} />
            <Campo rotulo="Horário" type="time" erro={errors.hora_evento?.message} {...register('hora_evento')} />
          </div>
        </div>

        <Campo
          rotulo="Local do evento (opcional)"
          placeholder="Ex.: Rafain Palace"
          autoComplete="off"
          erro={errors.local_evento?.message}
          {...register('local_evento')}
        />

        <Campo
          rotulo="Descrição"
          placeholder="Ex.: Formatura Medicina UNILA 2026"
          autoComplete="off"
          erro={errors.descricao?.message}
          {...register('descricao')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo="Valor total (R$)"
            inputMode="decimal"
            placeholder="3.000,00"
            autoComplete="off"
            erro={errors.valor_total?.message}
            {...register('valor_total', { onBlur: (e) => formatarCampoDinheiro(e.target.value, (v) => setValue('valor_total', v)) })}
          />
          <Campo rotulo="Nº do contrato (opcional)" autoComplete="off" {...register('numero_contrato')} />
        </div>
      </section>

      <section className="space-y-5 rounded-xl border border-stone-200 bg-white p-4 sm:p-6" aria-labelledby="titulo-plano">
        <div>
          <h2 id="titulo-plano" className="text-base font-semibold text-stone-900">
            Plano de parcelas
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Gere o plano a partir do sinal e da quantidade de parcelas e ajuste o que precisar. À vista: só o sinal, com 0 parcelas.
          </p>
        </div>

        <GeradorParcelas valorTotal={() => getValues('valor_total')} aoGerar={aplicarPlano} />

        <TabelaParcelas
          control={control}
          register={register}
          errors={errors}
          setValue={(campo, valor) => setValue(campo, valor)}
          remover={parcelas.remove}
          quantidade={parcelas.fields.length}
          chaves={parcelas.fields.map((f) => f.chave)}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Botao
            variante="secundario"
            onClick={() => {
              const atuais = getValues('parcelas')
              const ultima = atuais.at(-1)?.vencimento
              parcelas.append({
                sinal: false,
                valor: '',
                vencimento: ultima ? somarMeses(ultima, 1) : hojeISO(),
                pagoCentavos: 0,
              })
            }}
          >
            Adicionar parcela
          </Botao>
          <ResumoSoma control={control} />
        </div>

        {errosParcelas && <Alerta tipo="erro">{errosParcelas}</Alerta>}
      </section>

      {salvar.error && <Alerta tipo="erro">{mensagemErroBanco(salvar.error, { emUso: 'Uma parcela que já tem recebimento não pode ser removida do plano.' })}</Alerta>}

      <div className="flex flex-wrap gap-3">
        <Botao type="submit" carregando={salvar.isPending}>
          {id ? 'Salvar alterações' : 'Cadastrar trabalho'}
        </Botao>
        <Botao variante="secundario" onClick={() => navigate(-1)}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}

function formatarCampoDinheiro(texto: string, definir: (valor: string) => void) {
  const centavos = centavosDeTexto(texto)
  if (centavos !== null) definir(centavosParaCampo(centavos))
}

function GeradorParcelas({ valorTotal, aoGerar }: { valorTotal: () => string; aoGerar: (linhas: LinhaParcela[]) => void }) {
  const hoje = hojeISO()
  const [sinal, setSinal] = useState('')
  const [vencimentoSinal, setVencimentoSinal] = useState(hoje)
  const [quantidade, setQuantidade] = useState('')
  const [primeiroVencimento, setPrimeiroVencimento] = useState(somarMeses(hoje, 1))
  const [erro, setErro] = useState<string | null>(null)

  function gerar() {
    setErro(null)
    const totalCentavos = centavosDeTexto(valorTotal())
    if (!totalCentavos) {
      setErro('Informe o valor total do trabalho antes de gerar o plano.')
      return
    }
    const sinalCentavos = sinal.trim() === '' ? 0 : centavosDeTexto(sinal)
    if (sinalCentavos === null) {
      setErro('Valor do sinal inválido.')
      return
    }
    try {
      const plano = gerarPlano({
        totalCentavos,
        sinalCentavos,
        vencimentoSinal,
        quantidadeParcelas: quantidade.trim() === '' ? 0 : Number(quantidade),
        primeiroVencimento,
      })
      aoGerar(planoParaLinhas(plano))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível gerar o plano.')
    }
  }

  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo
          rotulo="Sinal (R$)"
          inputMode="decimal"
          placeholder="0,00"
          autoComplete="off"
          value={sinal}
          onChange={(e) => setSinal(e.target.value)}
          onBlur={() => formatarCampoDinheiro(sinal, setSinal)}
        />
        <Campo rotulo="Data do sinal" type="date" value={vencimentoSinal} onChange={(e) => setVencimentoSinal(e.target.value)} />
        <Campo
          rotulo="Nº de parcelas"
          type="number"
          min={0}
          max={60}
          inputMode="numeric"
          placeholder="0"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
        <Campo
          rotulo="1º vencimento"
          type="date"
          value={primeiroVencimento}
          onChange={(e) => setPrimeiroVencimento(e.target.value)}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Botao variante="secundario" onClick={gerar}>
          Gerar parcelas
        </Botao>
        <span className="text-xs text-stone-500">Parcelas mensais. Substitui o plano abaixo.</span>
      </div>
      {erro && (
        <div className="mt-3">
          <Alerta tipo="erro">{erro}</Alerta>
        </div>
      )}
    </div>
  )
}

type PropsTabela = {
  control: Control<DadosTrabalho>
  register: UseFormRegister<DadosTrabalho>
  errors: FieldErrors<DadosTrabalho>
  setValue: (campo: `parcelas.${number}.valor`, valor: string) => void
  remover: (indice: number) => void
  quantidade: number
  chaves: string[]
}

function TabelaParcelas({ control, register, errors, setValue, remover, quantidade, chaves }: PropsTabela) {
  const linhas = useWatch({ control, name: 'parcelas' }) ?? []

  if (quantidade === 0) {
    return <p className="text-sm text-stone-500">Nenhuma parcela ainda.</p>
  }

  const temSinal = !!linhas[0]?.sinal
  const totalParcelas = linhas.length - (temSinal ? 1 : 0)
  const rotulos = chaves.map((_, i) => (temSinal ? (i === 0 ? 'Sinal' : `${i}/${totalParcelas}`) : `${i + 1}/${totalParcelas}`))

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-600">
            <th scope="col" className="py-2 pr-3 font-medium">Parcela</th>
            <th scope="col" className="py-2 pr-3 font-medium">Valor (R$)</th>
            <th scope="col" className="py-2 pr-3 font-medium">Vencimento</th>
            <th scope="col" className="py-2 font-medium"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {chaves.map((chave, i) => {
            const linha = linhas[i]
            const rotulo = rotulos[i]
            const erroLinha = errors.parcelas?.[i]
            const pago = linha?.pagoCentavos ?? 0
            return (
              <tr key={chave} className="border-b border-stone-100 align-top last:border-0">
                <th scope="row" className="py-2 pr-3 pt-4 text-left font-medium text-stone-800">
                  {rotulo}
                  {pago > 0 && <span className="block text-xs font-normal text-emerald-700">recebido {formatarReais(pago)}</span>}
                </th>
                <td className="py-2 pr-3">
                  <Campo
                    rotulo={`Valor da parcela ${rotulo}`}
                    className="[&>label]:sr-only"
                    inputMode="decimal"
                    autoComplete="off"
                    erro={erroLinha?.valor?.message}
                    {...register(`parcelas.${i}.valor`, {
                      onBlur: (e) => formatarCampoDinheiro(e.target.value, (v) => setValue(`parcelas.${i}.valor`, v)),
                    })}
                  />
                </td>
                <td className="py-2 pr-3">
                  <Campo
                    rotulo={`Vencimento da parcela ${rotulo}`}
                    className="[&>label]:sr-only"
                    type="date"
                    erro={erroLinha?.vencimento?.message}
                    {...register(`parcelas.${i}.vencimento`)}
                  />
                </td>
                <td className="py-2 pt-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => remover(i)}
                    disabled={pago > 0}
                    title={pago > 0 ? 'Parcela com recebimento não pode ser removida' : undefined}
                    className="rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 hover:text-red-700 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ResumoSoma({ control }: { control: Control<DadosTrabalho> }) {
  const [linhas, valorTotal] = useWatch({ control, name: ['parcelas', 'valor_total'] })
  const total = centavosDeTexto(valorTotal ?? '')
  const soma = (linhas ?? []).reduce((s, l) => s + (centavosDeTexto(l.valor ?? '') ?? 0), 0)

  if (!total) return <p className="text-sm text-stone-600">Soma: {formatarReais(soma)}</p>

  const diferenca = total - soma
  const confere = diferenca === 0
  return (
    <p aria-live="polite" className={`text-sm font-medium ${confere ? 'text-emerald-700' : 'text-amber-700'}`}>
      Soma {formatarReais(soma)} de {formatarReais(total)}
      {confere ? ' ✓ confere' : diferenca > 0 ? ` · faltam ${formatarReais(diferenca)}` : ` · passou ${formatarReais(-diferenca)}`}
    </p>
  )
}
