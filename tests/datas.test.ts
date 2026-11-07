import { describe, expect, it } from "vitest";
import { formatarData, interpretarData } from "@/lib/format";

describe("datas", () => {
  it("mostra dd/mm/aaaa e aceita os dois formatos de entrada", () => {
    expect(formatarData("2026-11-10")).toBe("10/11/2026");
    expect(interpretarData("10/11/2026")).toBe("2026-11-10");
    expect(interpretarData("2026-11-10")).toBe("2026-11-10");
    expect(interpretarData("31/02/2026")).toBeNull();
    expect(interpretarData("")).toBeNull();
  });
});
