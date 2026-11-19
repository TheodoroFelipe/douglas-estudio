import { centavosDoBanco } from '../../lib/dinheiro'

export type LinhaCategoria = { chave: string; nome: string; classificacao: 'direta' | 'indireta'; total: number }

/** Soma os meses de cada tipo de despesa; as taxas de cartão viram uma categoria só. Maior primeiro. */
export function somarCategorias(
  linhas: { tipo_despesa_id: string | null; tipo_nome: string | null; classificacao: string | null; total: number | null }[],
): LinhaCategoria[] {
  const porChave = new Map<string, LinhaCategoria>()
  for (const l of linhas) {
    const chave = l.tipo_despesa_id ?? 'taxas'
    const atual = porChave.get(chave) ?? {
      chave,
      nome: l.tipo_despesa_id ? (l.tipo_nome ?? '') : 'Taxas de cartão',
      classificacao: l.classificacao === 'indireta' ? 'indireta' : 'direta',
      total: 0,
    }
    atual.total += centavosDoBanco(l.total)
    porChave.set(chave, atual)
  }
  return [...porChave.values()].filter((c) => c.total > 0).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))
}
