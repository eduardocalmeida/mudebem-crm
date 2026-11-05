import { describe, expect, it } from "vitest";
import { validarTransicao } from "@/lib/domain";

describe("transições da pipeline", () => {
  it("permite o comercial avançar até o contrato e declinar antes da execução", () => {
    expect(validarTransicao("COMERCIAL", "LEADS_DE_ENTRADA", "PROPOSTA")).toBeNull();
    expect(validarTransicao("COMERCIAL", "NEGOCIACAO", "CONTRATO")).toBeNull();
    expect(validarTransicao("COMERCIAL", "PROPOSTA", "PERDIDO")).toBeNull();
    expect(validarTransicao("COMERCIAL", "LEADS_DE_ENTRADA", "EM_EXECUCAO")).toMatch(/comercial/i);
    expect(validarTransicao("COMERCIAL", "EM_EXECUCAO", "PERDIDO")).toMatch(/não pode/i);
  });

  it("restringe operação e financeiro ao trecho de cada área", () => {
    expect(validarTransicao("OPERACAO", "CONTRATO", "A_EXECUTAR")).toBeNull();
    expect(validarTransicao("OPERACAO", "A_EXECUTAR", "EM_EXECUCAO")).toBeNull();
    expect(validarTransicao("OPERACAO", "CONTRATO", "EM_EXECUCAO")).toMatch(/operação/i);
    expect(validarTransicao("FINANCEIRO", "EM_EXECUCAO", "FATURADO_HAVER")).toBeNull();
    expect(validarTransicao("FINANCEIRO", "FATURADO_HAVER", "CONTAS_A_RECEBER")).toBeNull();
    expect(validarTransicao("FINANCEIRO", "CONTAS_A_RECEBER", "RECEBIDO")).toBeNull();
    expect(validarTransicao("FINANCEIRO", "LEADS_DE_ENTRADA", "RECEBIDO")).toMatch(/financeiro/i);
  });

  it("deixa administrador e API corrigirem qualquer etapa", () => {
    expect(validarTransicao("ADMIN", "RECEBIDO", "NEGOCIACAO")).toBeNull();
    expect(validarTransicao("API", "PERDIDO", "LEADS_DE_ENTRADA")).toBeNull();
    expect(validarTransicao("COMERCIAL", "RECEBIDO", "NEGOCIACAO")).toMatch(/administrador/i);
    expect(validarTransicao("ADMIN", "PRECIFICACAO", "PRECIFICACAO")).toMatch(/já está/i);
  });
});
