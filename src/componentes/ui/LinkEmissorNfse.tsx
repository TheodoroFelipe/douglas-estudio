// Atalho para o Emissor Nacional da NFS-e (gov.br), onde a nota é emitida de fato.
// Endereço fixo da tela de login: o "idr" que o site acrescenta na barra de
// endereço muda a cada acesso e não deve ficar gravado aqui.
export const URL_EMISSOR_NFSE = 'https://www.nfse.gov.br/EmissorNacional/Login'

export function LinkEmissorNfse({ rotulo = 'Emitir NFS-e no gov.br' }: { rotulo?: string }) {
  return (
    <a
      href={URL_EMISSOR_NFSE}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
    >
      {rotulo}
      <span aria-hidden>↗</span>
      <span className="sr-only">(abre o Emissor Nacional em outra aba)</span>
    </a>
  )
}
