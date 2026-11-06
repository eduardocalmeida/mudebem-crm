export const LIMIAR_ARRASTE_PX = 8;

const INTERATIVO = "a, button, input, select, textarea, label";

export function alvoInterativo(alvo: EventTarget | null) {
  if (!alvo || typeof alvo !== "object" || !("closest" in alvo)) return false;
  const closest = (alvo as Element).closest;
  return typeof closest === "function" && Boolean(closest.call(alvo, INTERATIVO));
}
