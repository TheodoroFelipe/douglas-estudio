// Formas de pagamento: rótulo da tela e como aparece no meio do texto do recibo.
export const FORMAS_PAGAMENTO = {
  pix: { rotulo: 'Pix', noTexto: 'Pix' },
  dinheiro: { rotulo: 'Dinheiro', noTexto: 'dinheiro' },
  cartao_credito: { rotulo: 'Cartão de crédito', noTexto: 'cartão de crédito' },
  cartao_debito: { rotulo: 'Cartão de débito', noTexto: 'cartão de débito' },
  boleto: { rotulo: 'Boleto', noTexto: 'boleto' },
  transferencia: { rotulo: 'Transferência', noTexto: 'transferência bancária' },
} as const
export type FormaPagamento = keyof typeof FORMAS_PAGAMENTO

export const FORMAS_COM_TAXA: readonly string[] = ['cartao_credito', 'cartao_debito']

export function rotuloForma(forma: string): string {
  return FORMAS_PAGAMENTO[forma as FormaPagamento]?.rotulo ?? forma
}

export function formaNoTexto(forma: string): string {
  return FORMAS_PAGAMENTO[forma as FormaPagamento]?.noTexto ?? forma
}
