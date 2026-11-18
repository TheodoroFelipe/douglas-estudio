// Grade do calendário (semanas de segunda a domingo) e eventos por dia.
// Datas como texto "AAAA-MM-DD", sem passar por fuso.

export type DiaGrade = { data: string; dia: number; doMes: boolean }

function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Dia da semana com segunda = 0 ... domingo = 6. */
function diaDaSemana(ano: number, mes: number, dia: number): number {
  return (new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() + 6) % 7
}

/** Semanas completas que cobrem o mês "AAAA-MM" (com os dias vizinhos nas pontas). */
export function gradeDoMes(anoMes: string): DiaGrade[][] {
  const ano = Number(anoMes.slice(0, 4))
  const mes = Number(anoMes.slice(5, 7))
  const total = diasNoMes(ano, mes)
  const antes = diaDaSemana(ano, mes, 1)
  const dias: DiaGrade[] = []

  const [anoAnt, mesAnt] = mes === 1 ? [ano - 1, 12] : [ano, mes - 1]
  const totalAnt = diasNoMes(anoAnt, mesAnt)
  for (let i = antes; i > 0; i--) {
    const d = totalAnt - i + 1
    dias.push({ data: iso(anoAnt, mesAnt, d), dia: d, doMes: false })
  }
  for (let d = 1; d <= total; d++) dias.push({ data: iso(ano, mes, d), dia: d, doMes: true })
  const [anoSeg, mesSeg] = mes === 12 ? [ano + 1, 1] : [ano, mes + 1]
  for (let d = 1; dias.length % 7 !== 0; d++) dias.push({ data: iso(anoSeg, mesSeg, d), dia: d, doMes: false })

  const semanas: DiaGrade[][] = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))
  return semanas
}

export type EventoCalendario = {
  id: string
  descricao: string
  data_evento: string | null
  hora_evento: string | null
  status: string
}

/** Eventos agrupados por data; no dia, primeiro os com horário (em ordem), depois os sem. */
export function eventosPorDia<T extends EventoCalendario>(eventos: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const e of eventos) {
    if (!e.data_evento) continue
    const lista = mapa.get(e.data_evento) ?? []
    lista.push(e)
    mapa.set(e.data_evento, lista)
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => {
      if (a.hora_evento && b.hora_evento) return a.hora_evento.localeCompare(b.hora_evento)
      if (a.hora_evento) return -1
      if (b.hora_evento) return 1
      return a.descricao.localeCompare(b.descricao, 'pt-BR')
    })
  }
  return mapa
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** "2026-12-12" → "sáb, 12/12" */
export function diaCurto(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  return `${DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()]}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

/** "19:30:00" → "19:30" */
export function horaCurta(hora: string | null): string {
  return hora ? hora.slice(0, 5) : ''
}
