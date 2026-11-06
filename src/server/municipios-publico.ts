import { UFS } from "@/lib/format";
import lista from "@/data/municipios-br.json";

const MUNICIPIOS = lista as Record<string, string[]>;

/**
 * A lista é um recorte público dos municípios (IBGE). A consulta ao vivo do IBGE
 * não responde daqui sem depender de rede instável, e a API oficial dos Correios
 * exigiria credencial. Nada disso é gravado como segredo.
 */
export function municipiosDaUf(uf: string): string[] {
  const sigla = uf.trim().toUpperCase();
  if (!UFS.includes(sigla as (typeof UFS)[number])) return [];
  return MUNICIPIOS[sigla] ?? [];
}
