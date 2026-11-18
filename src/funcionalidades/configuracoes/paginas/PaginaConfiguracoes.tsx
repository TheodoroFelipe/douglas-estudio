import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alerta } from '../../../componentes/ui/Alerta'
import { AreaTexto } from '../../../componentes/ui/AreaTexto'
import { Botao } from '../../../componentes/ui/Botao'
import { CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { formatarDocumento } from '../../../lib/documentos'
import { mensagemErroBanco } from '../../../lib/erros'
import { TAMANHO_MAXIMO_LOGO, TIPOS_LOGO, useConfiguracoes, useEnviarLogo, useLogo, useSalvarConfiguracoes } from '../consultas'
import {
  configuracoesParaBanco,
  configuracoesParaFormulario,
  esquemaConfiguracoes,
  pendenciasRecibo,
  type Configuracoes,
  type DadosConfiguracoes,
} from '../esquemas'

export function PaginaConfiguracoes() {
  const { data, isPending, error } = useConfiguracoes()

  return (
    <>
      <CabecalhoPagina titulo="Configurações" subtitulo="Dados do estúdio usados no recibo e os padrões da nota fiscal." />
      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar as configurações.</Alerta>
      ) : (
        <div className="max-w-3xl space-y-6">
          <Pendencias config={data} />
          <Logo config={data} />
          <Formulario config={data} />
        </div>
      )}
    </>
  )
}

function Pendencias({ config }: { config: Configuracoes }) {
  const faltando = pendenciasRecibo(config)
  if (faltando.length === 0) return <Alerta tipo="sucesso">Tudo pronto para emitir recibos.</Alerta>
  return <Alerta tipo="erro">Para emitir recibos, falta preencher: {faltando.join(', ')}.</Alerta>
}

function Logo({ config }: { config: Configuracoes }) {
  const logo = useLogo(config.logo_path)
  const enviar = useEnviarLogo()
  const entrada = useRef<HTMLInputElement>(null)
  const [erroArquivo, setErroArquivo] = useState('')

  function escolher(arquivo: File | undefined) {
    setErroArquivo('')
    if (!arquivo) return
    if (!TIPOS_LOGO.includes(arquivo.type)) return setErroArquivo('Use uma imagem PNG ou JPEG.')
    if (arquivo.size > TAMANHO_MAXIMO_LOGO) return setErroArquivo('A imagem pode ter no máximo 2 MB.')
    enviar.mutate({ arquivo, anterior: config.logo_path })
  }

  return (
    <section aria-labelledby="titulo-logo" className="rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <h2 id="titulo-logo" className="mb-1 text-base font-semibold text-stone-900">
        Logo do recibo
      </h2>
      <p className="mb-4 text-sm text-stone-600">PNG ou JPEG, até 2 MB. Prefira fundo branco ou transparente.</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-24 w-48 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 p-2">
          {logo.data ? (
            <img src={logo.data} alt="Logo atual do estúdio" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-sm text-stone-500">{config.logo_path && logo.isPending ? 'Carregando…' : 'Sem logo'}</span>
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={entrada}
            type="file"
            accept={TIPOS_LOGO.join(',')}
            className="sr-only"
            id="arquivo-logo"
            onChange={(e) => {
              escolher(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <Botao variante="secundario" carregando={enviar.isPending} onClick={() => entrada.current?.click()}>
            {config.logo_path ? 'Trocar logo' : 'Enviar logo'}
          </Botao>
          <p className="text-xs text-stone-500">Recibos já emitidos continuam com o logo de quando foram gerados.</p>
        </div>
      </div>
      {(erroArquivo || enviar.error) && (
        <div className="mt-3">
          <Alerta tipo="erro">{erroArquivo || mensagemErroBanco(enviar.error)}</Alerta>
        </div>
      )}
    </section>
  )
}

function Formulario({ config }: { config: Configuracoes }) {
  const salvar = useSalvarConfiguracoes()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<DadosConfiguracoes>({
    resolver: zodResolver(esquemaConfiguracoes),
    defaultValues: configuracoesParaFormulario(config),
  })

  async function enviar(dados: DadosConfiguracoes) {
    const salvo = await salvar.mutateAsync(configuracoesParaBanco(dados))
    reset(configuracoesParaFormulario(salvo))
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-6 rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <fieldset className="space-y-4">
        <legend className="mb-1 text-base font-semibold text-stone-900">Dados do estúdio</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome do estúdio" erro={errors.nome_fantasia?.message} {...register('nome_fantasia')} />
          <Campo rotulo="Razão social" erro={errors.razao_social?.message} {...register('razao_social')} />
          <Campo
            rotulo="CNPJ"
            inputMode="numeric"
            erro={errors.cnpj?.message}
            {...register('cnpj', { onBlur: (e) => setValue('cnpj', formatarDocumento(e.target.value)) })}
          />
          <Campo rotulo="Inscrição municipal" {...register('inscricao_municipal')} />
        </div>
        <AreaTexto rotulo="Endereço" rows={2} dica="Rua, número e bairro. Cidade e UF vão nos campos abaixo." {...register('endereco')} />
        <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
          <Campo rotulo="Cidade" erro={errors.cidade?.message} {...register('cidade')} />
          <Campo rotulo="UF" maxLength={2} erro={errors.uf?.message} {...register('uf')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Telefone" type="tel" {...register('telefone')} />
          <Campo rotulo="E-mail" type="email" erro={errors.email?.message} {...register('email')} />
        </div>
        <Campo rotulo="Quem assina o recibo" placeholder="Nome completo" {...register('responsavel_assinatura')} />
      </fieldset>

      <fieldset className="space-y-4 border-t border-stone-100 pt-6">
        <legend className="mb-1 text-base font-semibold text-stone-900">Padrões da nota fiscal</legend>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr_8rem]">
          <Campo rotulo="Código do serviço" erro={errors.codigo_servico_padrao?.message} {...register('codigo_servico_padrao')} />
          <Campo rotulo="Descrição do serviço" erro={errors.descricao_servico_padrao?.message} {...register('descricao_servico_padrao')} />
          <Campo rotulo="Alíquota ISS (%)" inputMode="decimal" erro={errors.aliquota_iss_padrao?.message} {...register('aliquota_iss_padrao')} />
        </div>
      </fieldset>

      {salvar.error && <Alerta tipo="erro">{mensagemErroBanco(salvar.error)}</Alerta>}
      {salvar.isSuccess && !isDirty && <Alerta tipo="sucesso">Configurações salvas.</Alerta>}

      <Botao type="submit" carregando={salvar.isPending}>
        Salvar configurações
      </Botao>
    </form>
  )
}
