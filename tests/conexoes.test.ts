import { describe, expect, it } from "vitest";
import { mascararId, situacaoChaves, situacaoSmtp, situacaoWebmania, situacaoWhatsapp } from "@/server/conexoes";

describe("status de conexões", () => {
  it("SMTP sem servidor fica sem credencial e não depende de senha gravada", () => {
    expect(situacaoSmtp({ host: false, senha: false }).situacao).toBe("falta");
    expect(situacaoSmtp({ host: true, senha: false }).situacao).toBe("pendente");
    expect(situacaoSmtp({ host: true, senha: true }).situacao).toBe("conectado");
  });

  it("Webmania distingue token ausente, homologação e produção", () => {
    expect(situacaoWebmania({ token: false, producao: false }).situacao).toBe("falta");
    expect(situacaoWebmania({ token: true, producao: false }).situacao).toBe("pendente");
    expect(situacaoWebmania({ token: true, producao: true }).situacao).toBe("conectado");
  });

  it("WhatsApp só fica conectado com número e token", () => {
    expect(situacaoWhatsapp({ numeros: 0, token: false }).situacao).toBe("falta");
    expect(situacaoWhatsapp({ numeros: 1, token: false }).situacao).toBe("pendente");
    expect(situacaoWhatsapp({ numeros: 0, token: true }).situacao).toBe("pendente");
    expect(situacaoWhatsapp({ numeros: 2, token: true }).situacao).toBe("conectado");
  });

  it("chave ativa conecta e o id fica mascarado", () => {
    expect(situacaoChaves(0).situacao).toBe("pendente");
    expect(situacaoChaves(1).situacao).toBe("conectado");
    expect(mascararId("exemplo-phone-id")).toBe("••••e-id");
    expect(mascararId("")).toBe("••••");
  });
});
