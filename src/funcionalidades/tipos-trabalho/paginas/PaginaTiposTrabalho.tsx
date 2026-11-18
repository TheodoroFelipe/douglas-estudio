import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { Botao } from '../../../componentes/ui/Botao'
import { BotaoConfirmar } from '../../../componentes/ui/BotaoConfirmar'
import { CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selo } from '../../../componentes/ui/Selo'
import { mensagemErroBanco } from '../../../lib/erros'
import {
  MENSAGENS_ERRO_TIPO,
  useApagarTipo,
  useAtualizarTipo,
  useCriarTipo,
  useTiposTrabalho,
  useUsoDosTipos,
  type TipoTrabalho,
} from '../consultas'

const pequeno = 'px-3! py-1.5!'

export function PaginaTiposTrabalho() {
  const tipos = useTiposTrabalho()
  const uso = useUsoDosTipos()

  return (
    <>
      <CabecalhoPagina
        titulo="Tipos de trabalho"
        subtitulo="Os tipos que aparecem no cadastro de trabalhos. Tipo em uso não se apaga: desative para tirar das opções."
        voltar={{ para: '/trabalhos', rotulo: 'Trabalhos' }}
      />
      <div className="max-w-3xl space-y-6">
        <NovoTipo />
        {tipos.isPending ? (
          <Carregando />
        ) : tipos.error ? (
          <Alerta tipo="erro">Não foi possível carregar os tipos.</Alerta>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {tipos.data.map((tipo) => (
              <LinhaTipo key={tipo.chave} tipo={tipo} usos={uso.data?.get(tipo.chave) ?? 0} usoCarregado={!!uso.data} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function NovoTipo() {
  const criar = useCriarTipo()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return setErro('Informe o nome do tipo.')
    try {
      await criar.mutateAsync(nome)
      setNome('')
    } catch (falha) {
      setErro(mensagemErroBanco(falha, MENSAGENS_ERRO_TIPO))
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <Campo
        rotulo="Novo tipo"
        placeholder="Ex.: Batizado"
        value={nome}
        maxLength={60}
        erro={erro}
        className="min-w-56 flex-1"
        onChange={(e) => {
          setNome(e.target.value)
          setErro('')
        }}
      />
      <Botao type="submit" carregando={criar.isPending}>
        Adicionar
      </Botao>
      {criar.isSuccess && !nome && <p className="w-full text-sm text-emerald-700">Tipo adicionado.</p>}
    </form>
  )
}

function LinhaTipo({ tipo, usos, usoCarregado }: { tipo: TipoTrabalho; usos: number; usoCarregado: boolean }) {
  const atualizar = useAtualizarTipo()
  const apagar = useApagarTipo()
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(tipo.nome)
  const erro = atualizar.error ?? apagar.error

  async function renomear(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || nome.trim() === tipo.nome) return setEditando(false)
    try {
      await atualizar.mutateAsync({ chave: tipo.chave, nome })
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
              {!usoCarregado ? '…' : usos === 0 ? 'Nenhum trabalho' : (
                <Link to={`/trabalhos?status=todos&tipo=${tipo.chave}`} className="underline underline-offset-4 hover:text-stone-800">
                  {usos === 1 ? '1 trabalho' : `${usos} trabalhos`}
                </Link>
              )}
            </p>
          </div>
        )}

        {!editando && (
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" className={pequeno} onClick={() => setEditando(true)}>
              Renomear
            </Botao>
            <Botao
              variante="secundario"
              className={pequeno}
              carregando={atualizar.isPending}
              onClick={() => atualizar.mutate({ chave: tipo.chave, ativo: !tipo.ativo })}
            >
              {tipo.ativo ? 'Desativar' : 'Reativar'}
            </Botao>
            {usoCarregado && usos === 0 && (
              <BotaoConfirmar pergunta={`Apagar o tipo ${tipo.nome}?`} rotuloConfirmar="Apagar" perigoso carregando={apagar.isPending} onConfirmar={() => apagar.mutate(tipo.chave)}>
                Apagar
              </BotaoConfirmar>
            )}
          </div>
        )}
      </div>
      {erro && <Alerta tipo="erro">{mensagemErroBanco(erro, MENSAGENS_ERRO_TIPO)}</Alerta>}
    </li>
  )
}
