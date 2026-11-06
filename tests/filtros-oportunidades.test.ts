import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lerFiltro, parametrosDe } from "@/lib/consulta";
import { prisma } from "@/lib/prisma";
import { listarProcessos } from "@/server/processos";

const kanban = readFileSync(new URL("../src/components/kanban.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const barra = readFileSync(new URL("../src/components/barra-filtros.tsx", import.meta.url), "utf8");

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Processo", "Cliente", "Usuario" RESTART IDENTITY CASCADE');
}

beforeEach(limpar);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("filtros da listagem", () => {
  it("rejeita data, valor e faixa invertida e monta a URL", () => {
    expect(() => lerFiltro(new URLSearchParams("de=32/13/2026"))).toThrow(/data/i);
    expect(() => lerFiltro(new URLSearchParams("freteMin=-1"))).toThrow(/reais/i);
    expect(() => lerFiltro(new URLSearchParams("totalMin=20&totalMax=10"))).toThrow(/mínimo/i);
    const filtro = lerFiltro(new URLSearchParams("etapas=PROPOSTA,NEGOCIACAO&origem=São Paulo&responsavelId=nenhum&de=2026-12-01"));
    expect(filtro.etapas).toEqual(["PROPOSTA", "NEGOCIACAO"]);
    expect(filtro.origem).toBe("São Paulo");
    expect(filtro.semResponsavel).toBe(true);
    expect(filtro.dataColetaDe).toBe("2026-12-01");
    const url = parametrosDe(filtro);
    expect(url).toContain("etapas=PROPOSTA%2CNEGOCIACAO");
    expect(url).toContain("origem=S%C3%A3o+Paulo");
    expect(url).toContain("responsavelId=nenhum");
    expect(url).not.toContain("pagina=");
  });

  it("filtra origem São Paulo, coleta, frete e etapas no banco, com total da consulta inteira", async () => {
    const cliente = await prisma.cliente.create({ data: { nome: "Atlas" } });
    const ana = await prisma.usuario.create({
      data: { nome: "Ana", email: "ana-filtro@mudebem.test", senhaHash: "hash", papel: "COMERCIAL" },
    });
    await prisma.processo.create({
      data: {
        codigo: "MB-FL-SP",
        titulo: "MB-FL-SP",
        canal: "EMAIL",
        etapa: "NEGOCIACAO",
        clienteId: cliente.id,
        origemCidade: "São Paulo",
        origemUf: "SP",
        destinoCidade: "Curitiba",
        destinoUf: "PR",
        dataColeta: new Date("2026-12-10T00:00:00.000Z"),
        valorFrete: 800,
        valorSeguro: 50,
        valorTotal: 900,
        responsavelId: ana.id,
      },
    });
    await prisma.processo.create({
      data: {
        codigo: "MB-FL-RJ",
        titulo: "MB-FL-RJ",
        canal: "EMAIL",
        etapa: "PROPOSTA",
        clienteId: cliente.id,
        origemCidade: "Rio de Janeiro",
        origemUf: "RJ",
        destinoCidade: "São Paulo",
        dataColeta: new Date("2026-01-02T00:00:00.000Z"),
        valorFrete: 100,
        responsavelId: null,
      },
    });
    const saoPaulo = await listarProcessos({ origem: "São Paulo", pagina: 1, porPagina: 1 });
    expect(saoPaulo.total).toBe(1);
    expect(saoPaulo.dados).toHaveLength(1);
    expect(saoPaulo.dados[0]?.codigo).toBe("MB-FL-SP");
    expect(saoPaulo.contagem.NEGOCIACAO).toBe(1);

    const combinado = await listarProcessos({
      origem: "São Paulo",
      etapas: ["NEGOCIACAO"],
      dataColetaDe: "2026-12-01",
      dataColetaAte: "2026-12-31",
      freteMin: 500,
      freteMax: 1000,
    });
    expect(combinado.total).toBe(1);
    expect(combinado.dados[0]?.codigo).toBe("MB-FL-SP");

    const semDono = await listarProcessos({ semResponsavel: true, destino: "São Paulo" });
    expect(semDono.dados.map((item) => item.codigo)).toEqual(["MB-FL-RJ"]);
    const fora = await listarProcessos({ origem: "São Paulo", etapas: ["PROPOSTA"] });
    expect(fora.total).toBe(0);
  });

  it("deixa a faixa da etapa no topo do cartão e tira a borda que o fechava", () => {
    expect(kanban).toContain("faixa-etapa");
    expect(kanban).toContain("LIMIAR_ARRASTE_PX");
    expect(css).toContain("background: #F7F4EF");
    expect(css).toMatch(/\.cartao-processo \{[^}]*border: 0/);
    expect(barra).toContain('aria-controls="painel-filtros"');
    expect(barra).toContain("Data de coleta, de");
    expect(barra).toContain("Sem responsável");
  });
});
