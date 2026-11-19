import { useState, type FormEvent } from 'react'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { BotaoConfirmar } from '../../../componentes/ui/BotaoConfirmar'
import { CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selecao } from '../../../componentes/ui/Selecao'
import { Selo } from '../../../componentes/ui/Selo'
import { mensagemErroBanco } from '../../../lib/erros'
import {
  MENSAGENS_ERRO_TIPO_DESPESA,
  useApagarTipoDespesa,
  useAtualizarTipoDespesa,
  useCriarTipoDespesa,
  useTiposDespesa,
  useUsoDosTiposDespesa,
  type TipoDespesa,
} from '../consultas'
import { CLASSIFICACOES, type Classificacao } from '../rotulos'

const pequeno = 'px-3! py-1.5!'

export function PaginaTiposDespesa() {
  const tipos = useTiposDespesa()
  const uso = useUsoDosTiposDespesa()

  return (
    <>
      <CabecalhoPagina
        titulo="Tipos de despesa"
        subtitulo="Direta é custo de um trabalho (exige escolher o trabalho); indireta é custo do estúdio. Tipo em uso não se apaga: desative para tirar das opções."
        voltar={{ para: '/despesas', rotulo: 'Despesas' }}
      />
      <div className="max-w-3xl space-y-6">
        <NovoTipo />
        <Alerta>
          Taxa de cartão não é um tipo de despesa: ela é lançada no próprio recebimento e já entra como despesa direta do trabalho.
        </Alerta>
        {tipos.isPending ? (
          <Carregando />
        ) : tipos.error ? (
          <Alerta tipo="erro">Não foi possível carregar os tipos.</Alerta>
        ) : (
          (Object.keys(CLASSIFICACOES) as Classificacao[]).map((classificacao) => {
            const doGrupo = tipos.data.filter((t) => t.classificacao === classificacao)
            const info = CLASSIFICACOES[classificacao]
            return (
              <section key={classificacao} aria-labelledby={`grupo-${classificacao}`}>
                <h2 id={`grupo-${classificacao}`} className="mb-2 text-base font-semibold text-stone-900">
                  {info.plural} <span className="font-normal text-stone-500">({info.explicacao})</span>
                </h2>
                {doGrupo.length === 0 ? (
                  <Alerta>Nenhum tipo cadastrado.</Alerta>
                ) : (
                  <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
                    {doGrupo.map((tipo) => (
                      <LinhaTipo key={tipo.id} tipo={tipo} usos={uso.data?.get(tipo.id) ?? 0} usoCarregado={!!uso.data} />
                    ))}
                  </ul>
                )}
              </section>
            )
          })
        )}
      </div>
    </>
  )
}

function NovoTipo() {
  const criar = useCriarTipoDespesa()
  const [nome, setNome] = useState('')
  const [classificacao, setClassificacao] = useState<Classificacao | ''>('')
  const [erros, setErros] = useState<{ nome?: string; classificacao?: string; banco?: string }>({})

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const novos = {
      nome: nome.trim() ? undefined : 'Informe o nome do tipo.',
      classificacao: classificacao ? undefined : 'Escolha se é direta ou indireta.',
    }
    if (novos.nome || novos.classificacao || !classificacao) return setErros(novos)
    try {
      await criar.mutateAsync({ nome, classificacao })
      setNome('')
      setClassificacao('')
    } catch (falha) {
      setErros({ banco: mensagemErroBanco(falha, MENSAGENS_ERRO_TIPO_DESPESA) })
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-wrap items-start gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <Campo
        rotulo="Novo tipo"
        placeholder="Ex.: Drone"
        value={nome}
        maxLength={60}
        erro={erros.nome}
        className="min-w-56 flex-1"
        onChange={(e) => {
          setNome(e.target.value)
          setErros({})
        }}
      />
      <Selecao
        rotulo="Classificação"
        value={classificacao}
        erro={erros.classificacao}
        className="w-56"
        onChange={(e) => {
          setClassificacao(e.target.value as Classificacao)
          setErros({})
        }}
      >
        <option value="" disabled>
          Escolha
        </option>
        {(Object.keys(CLASSIFICACOES) as Classificacao[]).map((c) => (
          <option key={c} value={c}>
            {CLASSIFICACOES[c].rotulo} ({CLASSIFICACOES[c].explicacao})
          </option>
        ))}
      </Selecao>
      <Botao type="submit" className="sm:mt-7" carregando={criar.isPending}>
        Adicionar
      </Botao>
      {erros.banco && (
        <div className="w-full">
          <Alerta tipo="erro">{erros.banco}</Alerta>
        </div>
      )}
      {criar.isSuccess && !nome && <p className="w-full text-sm text-emerald-700">Tipo adicionado.</p>}
    </form>
  )
}

function LinhaTipo({ tipo, usos, usoCarregado }: { tipo: TipoDespesa; usos: number; usoCarregado: boolean }) {
  const atualizar = useAtualizarTipoDespesa()
  const apagar = useApagarTipoDespesa()
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(tipo.nome)
  const erro = atualizar.error ?? apagar.error
  const outra: Classificacao = tipo.classificacao === 'direta' ? 'indireta' : 'direta'

  async function renomear(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || nome.trim() === tipo.nome) return setEditando(false)
    try {
      await atualizar.mutateAsync({ id: tipo.id, nome: nome.trim() })
      setEditando(false)
    } catch {
      // O erro aparece abaixo.
    }
  }

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {editando ? (
          <form onSubmit={renomear} className="flex flex-1 flex-wrap items-end gap-2">
            <Campo rotulo={`Novo nome para ${tipo.nome}`} value={nome} maxLength={60} autoFocus className="min-w-48 flex-1" onChange={(e) => setNome(e.target.value)} />
            <Botao type="submit" className={pequeno} carregando={atualizar.isPending}>
              Salvar
            </Botao>
            <Botao
              variante="secundario"
              className={pequeno}
              onClick={() => {
                setNome(tipo.nome)
                setEditando(false)
                atualizar.reset()
              }}
            >
              Cancelar
            </Botao>
          </form>
        ) : (
          <div className="min-w-0">
            <p className={`font-medium ${tipo.ativo ? 'text-stone-900' : 'text-stone-500'}`}>
              {tipo.nome} {!tipo.ativo && <Selo cor="neutro">Desativado</Selo>}
            </p>
            <p className="text-sm text-stone-500">
              {!usoCarregado ? '…' : usos === 0 ? 'Nenhuma despesa' : usos === 1 ? '1 despesa' : `${usos} despesas`}
            </p>
          </div>
        )}

        {!editando && (
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" className={pequeno} onClick={() => setEditando(true)}>
              Renomear
            </Botao>
            {/* Com despesas lançadas, a classificação não muda (o banco também impede). */}
            {usoCarregado && usos === 0 && (
              <Botao
                variante="secundario"
                className={pequeno}
                carregando={atualizar.isPending}
                onClick={() => atualizar.mutate({ id: tipo.id, classificacao: outra })}
              >
                Mudar para {CLASSIFICACOES[outra].rotulo.toLowerCase()}
              </Botao>
            )}
            <Botao
              variante="secundario"
              className={pequeno}
              carregando={atualizar.isPending}
              onClick={() => atualizar.mutate({ id: tipo.id, ativo: !tipo.ativo })}
            >
              {tipo.ativo ? 'Desativar' : 'Reativar'}
            </Botao>
            {usoCarregado && usos === 0 && (
              <BotaoConfirmar pergunta={`Apagar o tipo ${tipo.nome}?`} rotuloConfirmar="Apagar" perigoso carregando={apagar.isPending} onConfirmar={() => apagar.mutate(tipo.id)}>
                Apagar
              </BotaoConfirmar>
            )}
          </div>
        )}
      </div>
      {erro && <Alerta tipo="erro">{mensagemErroBanco(erro, MENSAGENS_ERRO_TIPO_DESPESA)}</Alerta>}
    </li>
  )
}
