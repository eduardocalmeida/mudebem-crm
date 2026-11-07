export const MOTIVOS_PERDA = [
  { id: "PRECO", rotulo: "Preço" },
  { id: "PRAZO", rotulo: "Prazo" },
  { id: "CONCORRENTE", rotulo: "Concorrente" },
  { id: "SEM_RESPOSTA", rotulo: "Sem resposta" },
  { id: "ESCOPO", rotulo: "Escopo" },
  { id: "OUTRO", rotulo: "Outro" },
] as const;

export type CodigoPerda = (typeof MOTIVOS_PERDA)[number]["id"];

export type ResultadoGravado = {
  comercial: "GANHO" | "PERDIDO" | null;
  motivoPerda: { codigo: CodigoPerda; detalhe: string | null } | null;
  posVenda: { nota: number | null; comentario: string | null } | null;
};

function objeto(valor: unknown): Record<string, unknown> {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) return { ...(valor as Record<string, unknown>) };
  return {};
}

export function codigoPerda(valor: string): CodigoPerda | null {
  return MOTIVOS_PERDA.some((item) => item.id === valor) ? (valor as CodigoPerda) : null;
}

export function rotuloMotivoPerda(codigo: string) {
  return MOTIVOS_PERDA.find((item) => item.id === codigo)?.rotulo ?? codigo;
}

export function lerResultado(extras: unknown): ResultadoGravado {
  const resultado = objeto(objeto(extras).resultado);
  const comercial = resultado.comercial === "GANHO" || resultado.comercial === "PERDIDO" ? resultado.comercial : null;
  const motivo = objeto(resultado.motivoPerda);
  const codigo = typeof motivo.codigo === "string" ? codigoPerda(motivo.codigo) : null;
  const pos = objeto(resultado.posVenda);
  const nota = typeof pos.nota === "number" && Number.isInteger(pos.nota) && pos.nota >= 0 && pos.nota <= 10 ? pos.nota : null;
  return {
    comercial,
    motivoPerda: codigo ? { codigo, detalhe: typeof motivo.detalhe === "string" ? motivo.detalhe : null } : null,
    posVenda: nota != null || typeof pos.comentario === "string" ? { nota, comentario: typeof pos.comentario === "string" ? pos.comentario : null } : null,
  };
}

export function ehGanho(etapa: string, extras: unknown) {
  return etapa === "GANHO" || lerResultado(extras).comercial === "GANHO";
}

export function ehPerdido(etapa: string, extras: unknown) {
  return etapa === "PERDIDO" || lerResultado(extras).comercial === "PERDIDO";
}

export function gravarResultado(extras: unknown, parcial: Partial<ResultadoGravado>): Record<string, unknown> {
  const base = objeto(extras);
  const atual = lerResultado(extras);
  const proximo = { ...atual, ...parcial };
  base.resultado = {
    comercial: proximo.comercial,
    motivoPerda: proximo.motivoPerda,
    posVenda: proximo.posVenda,
  };
  return base;
}

export function validarMotivoPerda(codigo: string, detalhe: string | null | undefined) {
  const id = codigoPerda(codigo);
  if (!id) return "Escolha o motivo da perda.";
  const texto = detalhe?.trim() ?? "";
  if (id === "OUTRO" && texto.length < 3) return "Descreva o motivo quando a opção for Outro.";
  if (texto.length > 500) return "O detalhe do motivo pode ter no máximo 500 caracteres.";
  return null;
}

export function validarNotaPosVenda(nota: number | null) {
  if (nota == null) return null;
  if (!Number.isInteger(nota) || nota < 0 || nota > 10) return "A nota de satisfação vai de 0 a 10.";
  return null;
}
