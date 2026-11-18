import { useState, type ReactNode } from 'react'
import { Alerta } from './Alerta'
import { Botao } from './Botao'
import { Campo } from './Campo'

type Props = {
  /** Ex.: "recibo 2026/0001", "nota 45". */
  oQue: string
  aviso: ReactNode
  rotuloBotao?: string
  carregando?: boolean
  erro?: string | null
  onConfirmar: (motivo: string) => void
}

const pequeno = 'px-3! py-1.5!'

/** Cancelamento com motivo obrigatório, na própria tela. */
export function CancelarComMotivo({ oQue, aviso, rotuloBotao = 'Cancelar', carregando, erro, onConfirmar }: Props) {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erroMotivo, setErroMotivo] = useState('')

  if (!aberto) {
    return (
      <Botao variante="secundario" className={pequeno} onClick={() => setAberto(true)}>
        {rotuloBotao}
      </Botao>
    )
  }

  function confirmar() {
    if (!motivo.trim()) {
      setErroMotivo('Informe o motivo.')
      return
    }
    onConfirmar(motivo.trim())
  }

  return (
    <div role="group" aria-label={`Cancelar ${oQue}`} className="w-72 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <Campo
        rotulo={`Motivo do cancelamento (${oQue})`}
        value={motivo}
        erro={erroMotivo}
        autoFocus
        onChange={(e) => {
          setMotivo(e.target.value)
          setErroMotivo('')
        }}
      />
      <p className="text-xs text-stone-600">{aviso}</p>
      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      <div className="flex gap-2">
        <Botao className={`${pequeno} bg-red-700! hover:bg-red-800!`} carregando={carregando} onClick={confirmar}>
          Confirmar cancelamento
        </Botao>
        <Botao variante="secundario" className={pequeno} disabled={carregando} onClick={() => setAberto(false)}>
          Voltar
        </Botao>
      </div>
    </div>
  )
}
