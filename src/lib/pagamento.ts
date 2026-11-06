export const FORMAS_PAGAMENTO_FICHA = [
  "TED/Pix à vista",
  "À vista - Cartão de Crédito",
  "Cartão de crédito - 10x s/ juros",
  "Entrada de 20% com saldo parcelado",
  "Entrada de 50% com saldo parcelado",
  "(PJ) Prazo de 7 dias - crédito em conta",
  "(PJ) Prazo de 14 dias - crédito em conta",
  "(PJ) Prazo de 21 dias - crédito em conta",
  "(PJ) Prazo de 30 dias - crédito em conta",
  "(PJ) Prazo de 60 dias - crédito em conta",
] as const;

export function formaPagamentoDaFicha(valor: string) {
  return (FORMAS_PAGAMENTO_FICHA as readonly string[]).includes(valor);
}
