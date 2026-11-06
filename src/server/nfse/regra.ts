export type DocumentoFiscal = "NFSE" | "CTE";

export function normalizarMunicipio(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function sugerirDocumentoFiscal(origem: string | null | undefined, destino: string | null | undefined): DocumentoFiscal | null {
  const saida = normalizarMunicipio(origem);
  const chegada = normalizarMunicipio(destino);
  if (!saida || !chegada) return null;
  return saida === chegada ? "NFSE" : "CTE";
}

export function documentoEfetivo(
  origem: string | null | undefined,
  destino: string | null | undefined,
  escolhido: string | null | undefined,
  manual: boolean,
): DocumentoFiscal {
  if (manual && (escolhido === "NFSE" || escolhido === "CTE")) return escolhido;
  return sugerirDocumentoFiscal(origem, destino) ?? "CTE";
}
