// Gráfico de colunas por mês, com uma linha opcional na mesma escala (R$).
// SVG próprio: colunas finas (≤ 24px) com topo arredondado, 2px de folga entre
// colunas, grade em traço fino, legenda, valores ao passar o mouse/tocar/focar
// e a tabela com os mesmos números.
import { useEffect, useId, useRef, useState } from 'react'
import { formatarReais } from '../../../lib/dinheiro'
import { escalaY, formatarTick } from '../escala'
import { mesCurto, rotuloEixo } from '../periodo'

export type SerieGrafico = { rotulo: string; cor: string; valores: number[] }

type Props = {
  titulo: string
  descricao?: string
  meses: string[]
  barras: SerieGrafico[]
  linha?: SerieGrafico
  destaque?: string | null
  atualizando?: boolean
}

const ALTURA_PLOT = 220
const MARGEM = { topo: 12, direita: 12, base: 28, esquerda: 76 }
const COR_GRADE = '#e7e5e4'
const COR_BASE = '#a8a29e'
const COR_TEXTO_EIXO = '#78716c'

/** Coluna com topo arredondado (4px) e base reta. */
function caminhoColuna(x: number, y: number, largura: number, altura: number): string {
  const r = Math.min(4, largura / 2, altura)
  return `M${x},${y + altura} V${y + r} Q${x},${y} ${x + r},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${y + altura} Z`
}

export function GraficoMensal({ titulo, descricao, meses, barras, linha, destaque, atualizando }: Props) {
  const idTitulo = useId()
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(640)
  const [ativo, setAtivo] = useState<number | null>(null)
  const [verTabela, setVerTabela] = useState(false)

  useEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(280, entrada.contentRect.width)))
    observador.observe(elemento)
    return () => observador.disconnect()
    // A caixa volta a existir quando sai da tabela.
  }, [verTabela])

  const todos = [...barras.flatMap((s) => s.valores), ...(linha?.valores ?? [])]
  const escala = escalaY(todos)
  const maiorTick = Math.max(Math.abs(escala.min), Math.abs(escala.max))
  const larguraPlot = largura - MARGEM.esquerda - MARGEM.direita
  const banda = larguraPlot / Math.max(meses.length, 1)
  const y = (v: number) => MARGEM.topo + ((escala.max - v) / (escala.max - escala.min)) * ALTURA_PLOT
  const xBanda = (i: number) => MARGEM.esquerda + i * banda

  const folga = 2
  const larguraColuna = Math.max(3, Math.min(24, (banda * 0.7 - folga * (barras.length - 1)) / barras.length))
  const larguraGrupo = larguraColuna * barras.length + folga * (barras.length - 1)
  // Rótulos do eixo X só onde cabem (~44px cada, como "jan/27"): um sim, outro não, ou a cada 3...
  const saltoRotulo = Math.max(1, Math.ceil(44 / banda))
  const series = [...barras, ...(linha ? [linha] : [])]

  return (
    <figure aria-labelledby={idTitulo} className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <figcaption id={idTitulo}>
          <span className="block text-base font-semibold text-stone-900">{titulo}</span>
          {descricao && <span className="block text-sm text-stone-600">{descricao}</span>}
        </figcaption>
        <button
          type="button"
          onClick={() => setVerTabela((v) => !v)}
          className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
        >
          {verTabela ? 'Ver gráfico' : 'Ver como tabela'}
        </button>
      </div>

      {/* Legenda: retângulo para colunas, traço para a linha. */}
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-700">
        {barras.map((s) => (
          <li key={s.rotulo} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: s.cor }} />
            {s.rotulo}
          </li>
        ))}
        {linha && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-4 rounded-full" style={{ background: linha.cor }} />
            {linha.rotulo}
          </li>
        )}
      </ul>

      {verTabela ? (
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-stone-600">
              <tr>
                <th scope="col" className="py-1.5 pr-4 font-medium">Mês</th>
                {series.map((s) => (
                  <th key={s.rotulo} scope="col" className="py-1.5 pl-4 text-right font-medium">{s.rotulo}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {meses.map((mes, i) => (
                <tr key={mes} className={mes === destaque ? 'bg-stone-50 font-medium' : ''}>
                  <th scope="row" className="py-1.5 pr-4 text-left font-normal text-stone-700">{mesCurto(mes)}</th>
                  {series.map((s) => (
                    <td key={s.rotulo} className="whitespace-nowrap py-1.5 pl-4 text-right tabular-nums text-stone-900">
                      {formatarReais(s.valores[i] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={caixa} className={`relative transition-opacity ${atualizando ? 'opacity-50' : ''}`}>
          <svg
            width={largura}
            height={MARGEM.topo + ALTURA_PLOT + MARGEM.base}
            role="img"
            aria-label={`${titulo}. Use Tab para ler os valores de cada mês, ou "Ver como tabela".`}
            className="block max-w-full"
          >
            {/* Mês em destaque (modo mês). */}
            {meses.map((mes, i) =>
              mes === destaque ? (
                <rect key={`d-${mes}`} x={xBanda(i)} y={MARGEM.topo} width={banda} height={ALTURA_PLOT} fill="#f5f5f4" />
              ) : null,
            )}

            {/* Grade e eixo Y. */}
            {escala.ticks.map((t) => (
              <g key={t}>
                <line
                  x1={MARGEM.esquerda}
                  x2={largura - MARGEM.direita}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? COR_BASE : COR_GRADE}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text x={MARGEM.esquerda - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={COR_TEXTO_EIXO} className="tabular-nums">
                  {formatarTick(t, maiorTick)}
                </text>
              </g>
            ))}

            {/* Colunas (crescem do zero). */}
            {meses.map((mes, i) => {
              const inicioGrupo = xBanda(i) + (banda - larguraGrupo) / 2
              return (
                <g key={mes} opacity={ativo === null || ativo === i ? 1 : 0.55}>
                  {barras.map((s, k) => {
                    const v = s.valores[i] ?? 0
                    if (v <= 0) return null
                    const topo = y(v)
                    return (
                      <path
                        key={s.rotulo}
                        d={caminhoColuna(inicioGrupo + k * (larguraColuna + folga), topo, larguraColuna, y(0) - topo)}
                        fill={s.cor}
                      />
                    )
                  })}
                </g>
              )
            })}

            {/* Linha (mesma escala) com marcadores de anel branco. */}
            {linha && (
              <>
                <polyline
                  points={linha.valores.map((v, i) => `${xBanda(i) + banda / 2},${y(v)}`).join(' ')}
                  fill="none"
                  stroke={linha.cor}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {linha.valores.map((v, i) => (
                  <circle key={meses[i]} cx={xBanda(i) + banda / 2} cy={y(v)} r={4} fill={linha.cor} stroke="#ffffff" strokeWidth={2} />
                ))}
              </>
            )}

            {/* Eixo X. */}
            {meses.map((mes, i) =>
              i % saltoRotulo === 0 ? (
                <text
                  key={`x-${mes}`}
                  x={xBanda(i) + banda / 2}
                  y={MARGEM.topo + ALTURA_PLOT + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill={mes === destaque ? '#1c1917' : COR_TEXTO_EIXO}
                  fontWeight={mes === destaque ? 600 : 400}
                >
                  {rotuloEixo(mes, i === 0)}
                </text>
              ) : null,
            )}

            {/* Áreas de toque/foco: a faixa inteira do mês. */}
            {meses.map((mes, i) => (
              <rect
                key={`h-${mes}`}
                x={xBanda(i)}
                y={MARGEM.topo}
                width={banda}
                height={ALTURA_PLOT}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${mesCurto(mes)}: ${series.map((s) => `${s.rotulo} ${formatarReais(s.valores[i] ?? 0)}`).join(', ')}`}
                onPointerEnter={() => setAtivo(i)}
                onPointerLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
                className="cursor-default outline-none focus-visible:stroke-stone-900"
              />
            ))}
          </svg>

          {ativo !== null && (
            <div
              role="presentation"
              className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md"
              style={
                xBanda(ativo) + banda / 2 > largura / 2
                  ? { right: largura - xBanda(ativo) + 8 }
                  : { left: xBanda(ativo) + banda + 8 }
              }
            >
              <p className="mb-1 text-xs font-medium text-stone-500">{mesCurto(meses[ativo])}</p>
              {series.map((s) => (
                <p key={s.rotulo} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <span aria-hidden className="inline-block h-0.5 w-3 rounded-full" style={{ background: s.cor }} />
                    {s.rotulo}
                  </span>
                  <span className="font-semibold tabular-nums text-stone-900">{formatarReais(s.valores[ativo] ?? 0)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  )
}
