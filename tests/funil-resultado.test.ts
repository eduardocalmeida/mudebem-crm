import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hashSenha } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { lerResultado } from "@/lib/resultado-comercial";
import { moverEtapa, registrarPosVenda } from "@/server/processos";

const pagina = readFileSync(new URL("../src/app/(app)/processos/[id]/page.tsx", import.meta.url), "utf8");
const colunas = readFileSync(new URL("../src/components/ficha-colunas.tsx", import.meta.url), "utf8");

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Evento", "Processo", "Cliente", "Usuario" RESTART IDENTITY CASCADE');
}

beforeEach(limpar);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("resultado comercial e pós-venda", () => {
  it("registra ganho ao entrar em execução e exige motivo para perder", async () => {
    const ana = await prisma.usuario.create({
      data: { nome: "Ana", email: "ana-funil@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "COMERCIAL" },
    });
    const opera = await prisma.usuario.create({
      data: { nome: "Otto", email: "otto-funil@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "OPERACAO" },
    });
    const fin = await prisma.usuario.create({
      data: { nome: "Fina", email: "fina-funil@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "FINANCEIRO" },
    });
    const cliente = await prisma.cliente.create({ data: { nome: "Funil" } });
    const comercial = { tipo: "usuario" as const, id: ana.id, nome: ana.nome, papel: "COMERCIAL" as const };
    const operacao = { tipo: "usuario" as const, id: opera.id, nome: opera.nome, papel: "OPERACAO" as const };
    const financeiro = { tipo: "usuario" as const, id: fin.id, nome: fin.nome, papel: "FINANCEIRO" as const };
    const admin = { tipo: "usuario" as const, id: ana.id, nome: ana.nome, papel: "ADMIN" as const };
    const processo = await prisma.processo.create({
      data: { codigo: "MB-FN-1", titulo: "MB-FN-1", canal: "EMAIL", etapa: "A_EXECUTAR", clienteId: cliente.id },
    });

    const ganho = await moverEtapa(operacao, processo.id, "EM_EXECUCAO");
    expect(ganho.processo.etapa).toBe("EM_EXECUCAO");
    expect(lerResultado(ganho.processo.extras).comercial).toBe("GANHO");
    await expect(moverEtapa(admin, processo.id, "GANHO")).rejects.toThrow(/execução/i);

    const proposta = await prisma.processo.create({
      data: { codigo: "MB-FN-2", titulo: "MB-FN-2", canal: "EMAIL", etapa: "PROPOSTA", clienteId: cliente.id },
    });
    await expect(moverEtapa(comercial, proposta.id, "PERDIDO")).rejects.toThrow(/motivo/i);
    await expect(moverEtapa({ tipo: "api", chaveId: "chave", nome: "API" }, proposta.id, "PERDIDO")).rejects.toThrow(/motivo/i);
    const perdido = await moverEtapa(comercial, proposta.id, "PERDIDO", null, { codigo: "PRECO", detalhe: "Acima da tabela" });
    expect(perdido.processo.etapa).toBe("PERDIDO");
    expect(lerResultado(perdido.processo.extras).motivoPerda?.codigo).toBe("PRECO");
    const ainda = await prisma.processo.findUnique({ where: { id: proposta.id } });
    expect(ainda).toBeTruthy();

    await expect(moverEtapa(comercial, processo.id, "PERDIDO", null, { codigo: "PRECO" })).rejects.toThrow(/não pode/i);

    const legado = await prisma.processo.create({
      data: { codigo: "MB-FN-3", titulo: "MB-FN-3", canal: "EMAIL", etapa: "GANHO", clienteId: cliente.id },
    });
    expect(legado.etapa).toBe("GANHO");

    const recebido = await prisma.processo.create({
      data: { codigo: "MB-FN-4", titulo: "MB-FN-4", canal: "EMAIL", etapa: "RECEBIDO", clienteId: cliente.id },
    });
    const pos = await moverEtapa(financeiro, recebido.id, "POS_VENDA");
    expect(pos.processo.etapa).toBe("POS_VENDA");
    await expect(registrarPosVenda(financeiro, recebido.id, 11, null)).rejects.toThrow(/0 a 10/);
    const nota = await registrarPosVenda(financeiro, recebido.id, 8, "Cliente satisfeito");
    expect(lerResultado(nota.extras).posVenda).toEqual({ nota: 8, comentario: "Cliente satisfeito" });
    expect(recebido.etapa).toBe("RECEBIDO");
  });

  it("mantém o chat montado e as tarefas dentro do resumo", () => {
    expect(pagina).not.toContain("Oportunidade");
    expect(pagina).toContain("FichaColunas");
    expect(pagina).toContain("<h1>{processo.codigo}</h1>");
    expect(colunas).not.toContain('rotulo: "Tarefas"');
    expect(colunas).toContain("hidden={aba !== painel.id}");
    expect(pagina).toContain("AbaTarefas");
    expect(pagina).toContain("MarcarPerdido");
  });
});
