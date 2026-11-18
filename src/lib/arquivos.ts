/** Entrega um arquivo ao navegador para baixar. */
export function salvarArquivo({ blob, nome }: { blob: Blob; nome: string }) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
