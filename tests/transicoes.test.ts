import { describe, expect, it } from "vitest";
import { validarTransicao } from "@/lib/domain";

describe("transições da pipeline", () => {
  it("permite o comercial avançar até o contrato e declinar antes da execução", () => {
    expect(validarTransicao("COMERCIAL", "COTACAO_RECEBIDA", "PROPOSTA_ENVIADA")).toBeNull();
    expect(validarTransicao("COMERCIAL", "NEGOCIACAO", "FECHADO_CONTRATO")).toBeNull();
    expect(validarTransicao("COMERCIAL", "PROPOSTA_ENVIADA", "PERDIDO_DECLINADO")).toBeNull();
    expect(validarTransicao("COMERCIAL", "COTACAO_RECEBIDA", "EM_EXECUCAO")).toMatch(/comercial/i);
    expect(validarTransicao("COMERCIAL", "EM_EXECUCAO", "PERDIDO_DECLINADO")).toMatch(/não pode/i);
  });

  it("restringe operação e financeiro ao trecho de cada área", () => {
    expect(validarTransicao("OPERACAO", "FECHADO_CONTRATO", "EM_EXECUCAO")).toBeNull();
    expect(validarTransicao("OPERACAO", "EM_EXECUCAO", "FINALIZADO")).toBeNull();
    expect(validarTransicao("OPERACAO", "FECHADO_CONTRATO", "FINALIZADO")).toMatch(/operação/i);
    expect(validarTransicao("FINANCEIRO", "FINALIZADO", "CONTAS_A_RECEBER")).toBeNull();
    expect(validarTransicao("FINANCEIRO", "CONTAS_A_RECEBER", "RECEBIDO")).toBeNull();
    expect(validarTransicao("FINANCEIRO", "COTACAO_RECEBIDA", "RECEBIDO")).toMatch(/financeiro/i);
  });

  it("deixa administrador e API corrigirem qualquer etapa", () => {
    expect(validarTransicao("ADMIN", "RECEBIDO", "NEGOCIACAO")).toBeNull();
    expect(validarTransicao("API", "PERDIDO_DECLINADO", "COTACAO_RECEBIDA")).toBeNull();
    expect(validarTransicao("COMERCIAL", "RECEBIDO", "NEGOCIACAO")).toMatch(/administrador/i);
    expect(validarTransicao("ADMIN", "PRECIFICACAO", "PRECIFICACAO")).toMatch(/já está/i);
  });
});
