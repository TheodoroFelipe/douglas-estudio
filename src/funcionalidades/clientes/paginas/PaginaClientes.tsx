import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Alerta } from '../../../componentes/ui/Alerta'
import { BotaoLink, CabecalhoPagina } from '../../../componentes/ui/CabecalhoPagina'
import { Campo } from '../../../componentes/ui/Campo'
import { Carregando } from '../../../componentes/ui/Carregando'
import { formatarDocumento } from '../../../lib/documentos'
import { useClientes } from '../consultas'
import { clienteCombina } from '../esquemas'

export function PaginaClientes() {
  const { data: clientes, isPending, error } = useClientes()
  const [busca, setBusca] = useState('')
  const filtrados = useMemo(() => (clientes ?? []).filter((c) => clienteCombina(c, busca)), [clientes, busca])

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        subtitulo={clientes && `${clientes.length} cadastrado${clientes.length === 1 ? '' : 's'}`}
        acoes={<BotaoLink para="/clientes/novo">Novo cliente</BotaoLink>}
      />

      <Campo
        rotulo="Buscar"
        type="search"
        placeholder="Nome ou CPF/CNPJ"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="mb-4 max-w-md"
      />

      {isPending ? (
        <Carregando />
      ) : error ? (
        <Alerta tipo="erro">Não foi possível carregar os clientes.</Alerta>
      ) : filtrados.length === 0 ? (
        <Alerta>{busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}</Alerta>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {filtrados.map((cliente) => (
            <li key={cliente.id}>
              <Link
                to={`/clientes/${cliente.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-stone-50"
              >
                <span className="font-medium text-stone-900">{cliente.nome}</span>
                <span className="text-sm text-stone-500">
                  {[cliente.cpf_cnpj && formatarDocumento(cliente.cpf_cnpj), cliente.telefone]
                    .filter(Boolean)
                    .join(' · ') || (cliente.tipo_pessoa === 'PJ' ? 'Pessoa jurídica' : 'Pessoa física')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
