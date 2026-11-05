import { describe, expect, it } from "vitest";
import { hashSenha, verificarSenha } from "@/lib/password";
import { assinarSessao, lerSessao } from "@/lib/token";

describe("autenticação", () => {
  it("confere a senha e rejeita uma senha diferente", async () => {
    const hash = await hashSenha("MudeBem@2026");
    expect(await verificarSenha("MudeBem@2026", hash)).toBe(true);
    expect(await verificarSenha("outra-senha", hash)).toBe(false);
  });

  it("emite um token de sessão e recusa token adulterado", async () => {
    const token = await assinarSessao({
      id: "usr_teste",
      nome: "Ana Costa",
      email: "ana.costa@mudebem.com.br",
      papel: "ADMIN",
    });
    const sessao = await lerSessao(token);
    expect(sessao).toMatchObject({ nome: "Ana Costa", papel: "ADMIN" });
    expect(await lerSessao(`${token}x`)).toBeNull();
    expect(await lerSessao(null)).toBeNull();
  });
});
