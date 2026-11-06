import { describe, expect, it } from "vitest";
import { alvoInterativo, LIMIAR_ARRASTE_PX } from "@/lib/kanban-arraste";

describe("arraste do cartão", () => {
  it("ignora links e botões e exige um limiar antes de arrastar", () => {
    expect(LIMIAR_ARRASTE_PX).toBeGreaterThanOrEqual(8);
    expect(alvoInterativo(null)).toBe(false);
    expect(alvoInterativo({ closest: () => null } as unknown as EventTarget)).toBe(false);
    const link = { closest: (seletor: string) => (seletor.includes("a") ? link : null) };
    expect(alvoInterativo(link as unknown as EventTarget)).toBe(true);
  });
});
