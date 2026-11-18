// Datas de negócio trafegam como texto "AAAA-MM-DD" (tipo date do banco).
// Nada de new Date("2026-01-31"): isso é meia-noite UTC e vira o dia anterior no Brasil.

const FUSO = 'America/Sao_Paulo'

/** Hoje no fuso de São Paulo, "AAAA-MM-DD". */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(agora)
}

/** "2026-03-09" → "09/03/2026". Texto vazio ou nulo → "". */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return ''
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

const nomesMeses = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })

/** "2026-03" → "março de 2026" */
export function formatarMes(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number)
  return `${nomesMeses.format(Date.UTC(ano, mes - 1, 1))} de ${ano}`
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/**
 * Soma meses mantendo o dia; se o mês não tiver o dia, usa o último dia.
 * somarMeses("2026-01-31", 1) → "2026-02-28"; somarMeses("2026-01-31", 2) → "2026-03-31".
 */
export function somarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const indice = ano * 12 + (mes - 1) + meses
  const novoAno = Math.floor(indice / 12)
  const novoMes = (indice % 12) + 1
  const novoDia = Math.min(dia, diasNoMes(novoAno, novoMes))
  return `${novoAno}-${String(novoMes).padStart(2, '0')}-${String(novoDia).padStart(2, '0')}`
}

export function ehDataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [ano, mes, dia] = iso.split('-').map(Number)
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(ano, mes)
}
