export const TIPOS_CTE = [
  { id: 0, rotulo: "0 — Normal" },
  { id: 1, rotulo: "1 — Complemento de valores" },
  { id: 3, rotulo: "3 — Substituto" },
] as const;

export const TIPOS_SERVICO = [
  { id: 0, rotulo: "0 — Normal" },
  { id: 1, rotulo: "1 — Subcontratação" },
  { id: 2, rotulo: "2 — Redespacho" },
  { id: 3, rotulo: "3 — Redespacho intermediário" },
  { id: 4, rotulo: "4 — Vinculado a multimodal" },
] as const;

export const MODAIS = [
  { id: "01", webmania: 1, rotulo: "01 — Rodoviário" },
  { id: "02", webmania: 2, rotulo: "02 — Aéreo" },
  { id: "03", webmania: 3, rotulo: "03 — Aquaviário" },
  { id: "04", webmania: 4, rotulo: "04 — Ferroviário" },
  { id: "05", webmania: 5, rotulo: "05 — Dutoviário" },
  { id: "06", webmania: 6, rotulo: "06 — Multimodal" },
] as const;

export const TOMADORES = [
  { id: 0, rotulo: "0 — Remetente" },
  { id: 1, rotulo: "1 — Expedidor" },
  { id: 2, rotulo: "2 — Recebedor" },
  { id: 3, rotulo: "3 — Destinatário" },
  { id: 4, rotulo: "4 — Outro" },
] as const;

export const CONTRIBUICOES = [
  { id: 1, rotulo: "1 — Contribuinte ICMS" },
  { id: 2, rotulo: "2 — Isento de inscrição estadual" },
  { id: 9, rotulo: "9 — Não contribuinte" },
] as const;

export const SITUACOES_ICMS = [
  { id: "00", rotulo: "Normal (00)" },
  { id: "20", rotulo: "Redução de base (20)" },
  { id: "40", rotulo: "Isento (40)" },
  { id: "41", rotulo: "Não tributada (41)" },
  { id: "51", rotulo: "Diferido (51)" },
  { id: "60", rotulo: "Substituição tributária (60)" },
  { id: "90", rotulo: "Outros (90)" },
  { id: "OU", rotulo: "Outra UF" },
  { id: "SN", rotulo: "Simples Nacional" },
] as const;

export const REGIMES = [
  { id: "SIMPLES", rotulo: "Simples" },
  { id: "PRESUMIDO", rotulo: "Presumido" },
  { id: "REAL", rotulo: "Real" },
  { id: "SIMPLES_EXCESSO", rotulo: "Simples excesso" },
] as const;

export const CST_IBS = [
  { id: "000", rotulo: "000" },
  { id: "200", rotulo: "200" },
  { id: "410", rotulo: "410" },
] as const;

export const TIPOS_DOCUMENTO = [
  { id: 1, rotulo: "1 — NF-e" },
  { id: 2, rotulo: "2 — NF" },
  { id: 3, rotulo: "3 — Declaração" },
  { id: 9, rotulo: "9 — Outros" },
] as const;

const ROTULOS_CFOP: Record<string, string> = {
  "5206": "Anulação de valor relativo a serviço de transporte",
  "5352": "Prestação de serviço de transporte a estabelecimento industrial",
  "5353": "Prestação de serviço de transporte a estabelecimento comercial",
  "5357": "Prestação de serviço de transporte a não contribuinte",
  "5932": "Prestação iniciada em UF diversa da do prestador",
  "5949": "Outra saída ou prestação não especificada",
  "6206": "Anulação de valor relativo a serviço de transporte",
  "6352": "Prestação de serviço de transporte a estabelecimento industrial",
  "6353": "Prestação de serviço de transporte a estabelecimento comercial",
  "6357": "Prestação de serviço de transporte a não contribuinte",
  "6932": "Prestação iniciada em UF diversa da do prestador",
  "6949": "Outra saída ou prestação não especificada",
  "7206": "Anulação de valor relativo a serviço de transporte",
  "7358": "Prestação de serviço de transporte",
  "7949": "Outra saída ou prestação não especificada",
};

function faixa(inicio: number, fim: number) {
  return Array.from({ length: fim - inicio + 1 }, (_, indice) => String(inicio + indice));
}

export const CFOPS = [...faixa(5350, 5362), "5932", "5933", "5949", ...faixa(6350, 6362), "6932", "6949", "7358", "7949", "5206", "6206", "7206"]
  .filter((codigo, indice, lista) => lista.indexOf(codigo) === indice)
  .sort()
  .map((id) => ({ id, rotulo: ROTULOS_CFOP[id] ? `${id} — ${ROTULOS_CFOP[id]}` : id }));

export const SECOES_CTE = [
  ["identificacao", "Identificação"],
  ["atores", "Atores"],
  ["carga", "Carga"],
  ["documentos", "NF-e e documentos"],
  ["tributacao", "Tributação"],
  ["rodoviario", "Veículo e motorista"],
  ["acoes", "Depois da emissão"],
] as const;
