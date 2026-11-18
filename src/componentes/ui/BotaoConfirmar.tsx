import { useState, type ReactNode } from 'react'
import { Botao } from './Botao'

type Props = {
  children: ReactNode
  /** Pergunta mostrada depois do primeiro clique. */
  pergunta: string
  rotuloConfirmar: string
  onConfirmar: () => void
  carregando?: boolean
  perigoso?: boolean
}

/** Ação que pede confirmação na própria tela (sem janela do navegador). */
export function BotaoConfirmar({ children, pergunta, rotuloConfirmar, onConfirmar, carregando, perigoso }: Props) {
  const [confirmando, setConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <Botao variante="secundario" onClick={() => setConfirmando(true)}>
        {children}
      </Botao>
    )
  }

  return (
    <div
      role="group"
      aria-label={pergunta}
      className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${perigoso ? 'border-red-200 bg-red-50' : 'border-stone-300 bg-stone-50'}`}
    >
      <span className="text-sm text-stone-800">{pergunta}</span>
      <Botao
        carregando={carregando}
        className={perigoso ? 'bg-red-700! hover:bg-red-800!' : ''}
        onClick={onConfirmar}
      >
        {rotuloConfirmar}
      </Botao>
      <Botao variante="secundario" onClick={() => setConfirmando(false)} disabled={carregando}>
        Voltar
      </Botao>
    </div>
  )
}
