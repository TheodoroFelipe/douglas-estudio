import { useState } from 'react'
import { Botao } from '../../../componentes/ui/Botao'
import { Campo } from '../../../componentes/ui/Campo'
import { mensagemErroBanco } from '../../../lib/erros'
import { MENSAGENS_ERRO_TIPO, useCriarTipo, type TipoTrabalho } from '../consultas'

const pequeno = 'px-3! py-1.5!'

/** Cadastra um tipo sem sair do formulário; ao salvar, devolve o tipo criado. */
export function NovoTipoInline({ onCriado }: { onCriado: (tipo: TipoTrabalho) => void }) {
  const criar = useCriarTipo()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')

  if (!aberto) {
    return (
      <Botao variante="link" className="text-sm" onClick={() => setAberto(true)}>
        + Novo tipo
      </Botao>
    )
  }

  async function salvar() {
    if (!nome.trim()) return setErro('Informe o nome do tipo.')
    try {
      const tipo = await criar.mutateAsync(nome)
      onCriado(tipo)
      setNome('')
      setAberto(false)
    } catch (e) {
      setErro(mensagemErroBanco(e, MENSAGENS_ERRO_TIPO))
    }
  }

  return (
    <div role="group" aria-label="Novo tipo de trabalho" className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <Campo
        rotulo="Nome do novo tipo"
        placeholder="Ex.: Batizado"
        value={nome}
        maxLength={60}
        erro={erro}
        autoFocus
        onChange={(e) => {
          setNome(e.target.value)
          setErro('')
        }}
        onKeyDown={(e) => {
          // Enter aqui cria o tipo, sem enviar o formulário do trabalho.
          if (e.key === 'Enter') {
            e.preventDefault()
            salvar()
          }
          if (e.key === 'Escape') setAberto(false)
        }}
      />
      <div className="flex gap-2">
        <Botao className={pequeno} carregando={criar.isPending} onClick={salvar}>
          Criar tipo
        </Botao>
        <Botao variante="secundario" className={pequeno} disabled={criar.isPending} onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
      </div>
    </div>
  )
}
