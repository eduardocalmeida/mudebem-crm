import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const desktop = css.slice(css.indexOf("@media (min-width: 801px)"), css.indexOf("@media (max-width: 800px)"));

describe("menu lateral no desktop", () => {
  it("expande no hover e no foco visível do teclado, sem prender o menu depois do clique", () => {
    expect(desktop).toContain(".barra:hover");
    expect(desktop).toContain(".barra:has(:focus-visible)");
    expect(desktop).not.toContain(":focus-within");
    expect(desktop).not.toContain("config-aberta");
  });
});
