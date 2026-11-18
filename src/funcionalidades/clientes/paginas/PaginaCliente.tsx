import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { AreaTexto } from '../../../componentes/ui/AreaTexto'
import { Botao } from '../../../componentes/ui/Botao'
import { BotaoConfirmar } from '../../../componentes/ui/BotaoConfirmar'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selo } from '../../../componentes/ui/Selo'
import { formatarData } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { formatarDocumento } from '../../../lib/documentos'
import { mensagemErroBanco } from '../../../lib/erros'
import { useTrabalhos } from '../../trabalhos/consultas'
import { infoStatusTrabalho } from '../../trabalhos/rotulos'
import { MENSAGENS_ERRO_CLIENTE, useApagarCliente, useCliente, useSalvarCliente } from '../consultas'
import {
  clienteParaBanco,
  clienteParaFormulario,
  clienteVazio,
  esquemaCliente,
  type DadosCliente,
} from '../esquemas'

export function PaginaCliente() {
  const { id } = useParams()
  const novo = !id
  const consulta = useCliente(id)

  if (!novo && consulta.isPending) return <Carregando />
  if (!novo && (consulta.error || !consulta.data)) {
    return (
      <>
        <CabecalhoPagina titulo="Cliente" voltar={{ para: '/clientes', rotulo: 'Clientes' }} />
        <Alerta tipo="erro">
          {consulta.error ? 'Não foi possível carregar o cliente.' : 'Cliente não encontrado.'}
        </Alerta>
      </>
    )
  }

  const valoresIniciais = consulta.data ? clienteParaFormulario(consulta.data) : clienteVazio
  return (
    <>
      <CabecalhoPagina
        titulo={novo ? 'Novo cliente' : consulta.data!.nome}
        voltar={{ para: '/clientes', rotulo: 'Clientes' }}
      />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,40rem)_minmax(0,1fr)]">
        <FormularioCliente key={id ?? 'novo'} id={id} valoresIniciais={valoresIniciais} />
        {id && <TrabalhosDoCliente clienteId={id} />}
      </div>
    </>
  )
}

function FormularioCliente({ id, valoresIniciais }: { id?: string; valoresIniciais: DadosCliente }) {
  const navigate = useNavigate()
  const salvar = useSalvarCliente()
  const [salvo, setSalvo] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<DadosCliente>({ resolver: zodResolver(esquemaCliente), defaultValues: valoresIniciais })

  const tipoPessoa = useWatch({ control, name: 'tipo_pessoa' })

  async function enviar(dados: DadosCliente) {
    try {
      const novoId = await salvar.mutateAsync({ id, dados: clienteParaBanco(dados) })
      if (id) {
        reset(dados)
        setSalvo(true)
      } else navigate(`/clientes/${novoId}`, { replace: true })
    } catch {
      // O erro aparece pelo estado da mutation.
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <Campo rotulo="Nome" autoComplete="off" erro={errors.nome?.message} {...register('nome')} />

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-stone-700">Tipo de pessoa</legend>
        <div className="flex gap-4">
          {(['PF', 'PJ'] as const).map((tipo) => (
            <label key={tipo} className="flex items-center gap-2 text-sm text-stone-800">
              <input type="radio" value={tipo} {...register('tipo_pessoa')} className="accent-stone-900" />
              {tipo === 'PF' ? 'Pessoa física' : 'Pessoa jurídica (ex.: comissão de formatura)'}
            </label>
          ))}
        </div>
      </fieldset>

      <Campo
        rotulo={tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
        inputMode="numeric"
        autoComplete="off"
        placeholder={tipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
        erro={errors.cpf_cnpj?.message}
        {...register('cpf_cnpj', {
          onBlur: (e) => setValue('cpf_cnpj', formatarDocumento(e.target.value)),
        })}
      />
      <p className="-mt-3 text-xs text-stone-500">Opcional no cadastro; obrigatório para emitir recibo.</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo rotulo="Telefone" type="tel" autoComplete="off" {...register('telefone')} />
        <Campo rotulo="E-mail" type="email" autoComplete="off" erro={errors.email?.message} {...register('email')} />
      </div>

      <AreaTexto rotulo="Endereço" rows={2} dica="Usado no recibo e na nota fiscal." {...register('endereco')} />

      <AreaTexto
        rotulo="Observações"
        dica="Para anotações do trabalho. Não guarde aqui dados pessoais (documentos, saúde, dados bancários etc.)."
        {...register('observacoes')}
      />

      {salvar.error && (
        <Alerta tipo="erro">{mensagemErroBanco(salvar.error, MENSAGENS_ERRO_CLIENTE)}</Alerta>
      )}
      {salvo && !isDirty && <Alerta tipo="sucesso">Alterações salvas.</Alerta>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Botao type="submit" carregando={salvar.isPending}>
          {id ? 'Salvar alterações' : 'Cadastrar cliente'}
        </Botao>
        {id && <ApagarCliente id={id} />}
      </div>
    </form>
  )
}

function ApagarCliente({ id }: { id: string }) {
  const navigate = useNavigate()
  const apagar = useApagarCliente()
  return (
    <div className="space-y-2">
      <BotaoConfirmar
        pergunta="Apagar este cliente?"
        rotuloConfirmar="Apagar"
        perigoso
        carregando={apagar.isPending}
        onConfirmar={() => apagar.mutate(id, { onSuccess: () => navigate('/clientes', { replace: true }) })}
      >
        Apagar cliente
      </BotaoConfirmar>
      {apagar.error && <Alerta tipo="erro">{mensagemErroBanco(apagar.error, MENSAGENS_ERRO_CLIENTE)}</Alerta>}
    </div>
  )
}

function TrabalhosDoCliente({ clienteId }: { clienteId: string }) {
  const { data, isPending } = useTrabalhos()
  const trabalhos = (data ?? []).filter((t) => t.cliente_id === clienteId)

  return (
    <section aria-labelledby="titulo-trabalhos-cliente">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="titulo-trabalhos-cliente" className="text-base font-semibold text-stone-900">
          Trabalhos
        </h2>
        <BotaoLink para={`/trabalhos/novo?cliente=${clienteId}`} variante="secundario">
          Novo trabalho
        </BotaoLink>
      </div>
      {isPending ? (
        <Carregando />
      ) : trabalhos.length === 0 ? (
        <Alerta>Nenhum trabalho para este cliente.</Alerta>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {trabalhos.map((t) => {
            const status = infoStatusTrabalho(t.status)
            return (
              <li key={t.trabalho_id}>
                <Link to={`/trabalhos/${t.trabalho_id}`} className="block px-4 py-3 hover:bg-stone-50">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-stone-900">{t.descricao}</span>
                    <Selo cor={status.cor}>{status.rotulo}</Selo>
                  </div>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {[formatarData(t.data_evento), formatarReais(centavosDoBanco(t.valor_total))]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
