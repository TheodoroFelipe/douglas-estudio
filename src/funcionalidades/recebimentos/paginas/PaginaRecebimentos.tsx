import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { Selecao } from '../../../componentes/ui/Selecao'
import { formatarMes, hojeISO } from '../../../lib/datas'
import { centavosDoBanco, formatarReais } from '../../../lib/dinheiro'
import { TabelaRecebimentos } from '../componentes/TabelaRecebimentos'
import { useRecebimentosDoMes } from '../consultas'
import { FORMAS_PAGAMENTO } from '../rotulos'

export function PaginaRecebimentos() {
  const [parametros, setParametros] = useSearchParams()
  const mes = parametros.get('mes') || hojeISO().slice(0, 7)
  const forma = parametros.get('forma') ?? ''
  const { data, isPending, error } = useRecebimentosDoMes(mes)

  function definir(chave: string, valor: string) {
    const novos = new URLSearchParams(parametros)
    if (valor) novos.set(chave, valor)
    else novos.delete(chave)
    setParametros(novos, { replace: true })
  }

  const filtrados = useMemo(() => (data ?? []).filter((r) => !forma || r.forma_pagamento === forma), [data, forma])

  // Estornados aparecem na lista, mas não entram nos totais.
  const totais = useMemo(() => {
    const confirmados = filtrados.filter((r) => r.status === 'confirmado')
    const recebido = confirmados.reduce((soma, r) => soma + centavosDoBanco(r.valor), 0)
    const taxas = confirmados.reduce((soma, r) => soma + centavosDoBanco(r.taxa), 0)
    const semRecibo = confirmados.filter((r) => !r.recibo_id).length
    return { recebido, taxas, liquido: recebido - taxas, semRecibo }
  }, [filtrados])

  return (
    <>
      <CabecalhoPagina
        titulo="Recebimentos"
        acoes={<BotaoLink para="/recebimentos/novo">Registrar recebimento</BotaoLink>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Mês" type="month" value={mes} onChange={(e) => definir('mes', e.target.value)} />
        <Selecao rotulo="Forma de pagamento" value={forma} onChange={(e) => definir('forma', e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(FORMAS_PAGAMENTO).map(([valor, { rotulo }]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Selecao>
      </div>

      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar os recebimentos.</Alerta>
      ) : (
        <>
          <dl className="mb-6 grid gap-3 sm:grid-cols-3">
            <Indicador rotulo={`Recebido em ${formatarMes(mes)}`} valor={formatarReais(totais.recebido)} />
            <Indicador rotulo="Taxas de cartão" valor={formatarReais(totais.taxas)} />
            <Indicador rotulo="Líquido" valor={formatarReais(totais.liquido)} />
          </dl>
          {totais.semRecibo > 0 && (
            <div className="mb-4">
              <Alerta>
                {totais.semRecibo === 1 ? '1 recebimento ainda não tem recibo.' : `${totais.semRecibo} recebimentos ainda não têm recibo.`}
              </Alerta>
            </div>
          )}
          {filtrados.length === 0 ? (
            <Alerta>{data.length === 0 ? 'Nenhum recebimento neste mês.' : 'Nenhum recebimento com essa forma de pagamento.'}</Alerta>
          ) : (
            <TabelaRecebimentos recebimentos={filtrados} mostrarTrabalho />
          )}
        </>
      )}
    </>
  )
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <dt className="text-sm text-stone-600 first-letter:uppercase">{rotulo}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{valor}</dd>
    </div>
  )
}
