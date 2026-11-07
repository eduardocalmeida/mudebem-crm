export const PAPEL_CONTATO_IDS = ["comprador", "dono_mudanca", "colaborador", "outro"] as const;
export type PapelContatoOportunidade = (typeof PAPEL_CONTATO_IDS)[number];

export const PAPEIS_CONTATO_OPORTUNIDADE: { id: PapelContatoOportunidade; rotulo: string }[] = [
  { id: "comprador", rotulo: "Comprador" },
  { id: "dono_mudanca", rotulo: "Dono da mudança" },
  { id: "colaborador", rotulo: "Colaborador" },
  { id: "outro", rotulo: "Outro" },
];

export type VinculoContato = { contatoId: string; papel: PapelContatoOportunidade };

export function rotuloPapelContato(papel: string) {
  return PAPEIS_CONTATO_OPORTUNIDADE.find((item) => item.id === papel)?.rotulo ?? papel;
}

export function papelContatoValido(valor: string): valor is PapelContatoOportunidade {
  return (PAPEL_CONTATO_IDS as readonly string[]).includes(valor);
}

export function lerVinculos(extras: unknown): VinculoContato[] {
  if (!extras || typeof extras !== "object" || Array.isArray(extras)) return [];
  const lista = (extras as { contatosOportunidade?: unknown }).contatosOportunidade;
  if (!Array.isArray(lista)) return [];
  const vistos = new Set<string>();
  const saida: VinculoContato[] = [];
  for (const item of lista) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const contatoId = "contatoId" in item && typeof item.contatoId === "string" ? item.contatoId : "";
    const papel = "papel" in item && typeof item.papel === "string" ? item.papel : "";
    if (!contatoId || !papelContatoValido(papel) || vistos.has(contatoId)) continue;
    vistos.add(contatoId);
    saida.push({ contatoId, papel });
  }
  return saida;
}

export function alternarExpansao(abertos: readonly string[], id: string) {
  return abertos.includes(id) ? abertos.filter((item) => item !== id) : [...abertos, id];
}
