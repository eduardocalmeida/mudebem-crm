import type { Papel } from "@/lib/domain";

export type Ator =
  | { tipo: "usuario"; id: string; nome: string; papel: Papel }
  | { tipo: "api"; chaveId: string; nome: string };

export function autoridadeDo(ator: Ator) {
  return ator.tipo === "api" ? ("API" as const) : ator.papel;
}

export function nomeAtor(ator: Ator) {
  return ator.tipo === "api" ? `API · ${ator.nome}` : ator.nome;
}

export function semIndefinidos<T extends Record<string, unknown>>(objeto: T): Partial<T> {
  return Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined)) as Partial<T>;
}
