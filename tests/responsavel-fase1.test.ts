import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hashSenha } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { atualizarProcesso, criarProcesso, obterProcesso, responsavelNaCriacao } from "@/server/processos";
import { receberLeadPublico } from "@/server/formulario-publico";

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Mensagem", "Conversa", "ItemInventario", "Tarefa", "Anexo", "Evento", "Processo", "Contato", "Cliente", "Usuario" RESTART IDENTITY CASCADE',
  );
}

beforeEach(limpar);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("responsável na criação", () => {
  it("atribui o criador autenticado e deixa campanha, API sem dono e portal fora dessa regra", async () => {
    const ana = await prisma.usuario.create({
      data: { nome: "Ana", email: "ana-resp@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "ADMIN" },
    });
    const bruno = await prisma.usuario.create({
      data: { nome: "Bruno", email: "bruno-resp@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "COMERCIAL" },
    });
    const ator = { tipo: "usuario" as const, id: ana.id, nome: ana.nome, papel: "ADMIN" as const };

    expect(responsavelNaCriacao(ator, { responsavelId: bruno.id })).toBe(ana.id);
    expect(responsavelNaCriacao(ator, { responsavelId: bruno.id, utmSource: "google" })).toBeNull();
    expect(responsavelNaCriacao(ator, { formulario: "orcamento-site" })).toBeNull();
    expect(responsavelNaCriacao({ tipo: "api", chaveId: "chave", nome: "Agente" }, { responsavelId: bruno.id })).toBe(bruno.id);
    expect(responsavelNaCriacao({ tipo: "api", chaveId: "whatsapp", nome: "WhatsApp Cloud API" }, {})).toBeNull();

    const manual = await criarProcesso(ator, {
      titulo: "Abertura manual",
      canal: "EMAIL",
      cliente: { nome: "Cliente Manual" },
      responsavelId: bruno.id,
    });
    expect(manual.responsavel?.id).toBe(ana.id);

    const campanha = await criarProcesso(ator, {
      titulo: "Lead de anúncio",
      canal: "SITE",
      cliente: { nome: "Lead Campanha" },
      utmSource: "google",
      responsavelId: ana.id,
    });
    expect(campanha.responsavel).toBeNull();

    const publico = await receberLeadPublico({
      nome: "Marina Campanha",
      email: "marina.campanha@example.com",
      utmSource: "meta",
      utmCampaign: "mudanca-verao",
    });
    const gravado = await prisma.processo.findFirst({ where: { codigo: publico.codigo } });
    expect(gravado?.responsavelId).toBeNull();
    expect(gravado?.formulario).toBe("orcamento-site");
  });

  it("não vincula contato de outro cliente e evita nome duplicado no mesmo cliente", async () => {
    const ana = await prisma.usuario.create({
      data: { nome: "Ana", email: "ana-contato@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "ADMIN" },
    });
    const ator = { tipo: "usuario" as const, id: ana.id, nome: ana.nome, papel: "ADMIN" as const };
    const a = await prisma.cliente.create({ data: { nome: "Cliente A" } });
    const b = await prisma.cliente.create({ data: { nome: "Cliente B" } });
    const contatoB = await prisma.contato.create({ data: { clienteId: b.id, nome: "João", email: "joao@b.example" } });
    const processo = await prisma.processo.create({
      data: { codigo: "MB-CT-1", titulo: "MB-CT-1", canal: "EMAIL", clienteId: a.id, responsavelId: ana.id },
    });

    await expect(atualizarProcesso(ator, processo.id, { contatoId: contatoB.id })).rejects.toThrow(/neste cliente/);

    const criado = await atualizarProcesso(ator, processo.id, { contato: { nome: "Maria Souza", telefone: "(62) 98888-1010" } });
    expect(criado.contato?.nome).toBe("Maria Souza");
    const maria = await prisma.contato.findFirst({ where: { nome: "Maria Souza" } });
    expect(maria?.clienteId).toBe(a.id);
    await expect(atualizarProcesso(ator, processo.id, { contato: { nome: "maria souza", email: "outra@example.com" } })).rejects.toThrow(/Selecione-o/);
    const ainda = await obterProcesso(processo.id);
    expect(ainda.contato?.nome).toBe("Maria Souza");
    expect(ainda.colaborador).toBeNull();
  });

  it("grava a data de embalagem sem coluna nova e mantém a data pretendida antiga", async () => {
    const ana = await prisma.usuario.create({
      data: { nome: "Ana", email: "ana-data@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "ADMIN" },
    });
    const ator = { tipo: "usuario" as const, id: ana.id, nome: ana.nome, papel: "ADMIN" as const };
    const cliente = await prisma.cliente.create({ data: { nome: "Datas" } });
    const processo = await prisma.processo.create({
      data: {
        codigo: "MB-DT-1",
        titulo: "MB-DT-1",
        canal: "EMAIL",
        clienteId: cliente.id,
        dataPretendida: new Date("2026-12-01T00:00:00.000Z"),
      },
    });
    await atualizarProcesso(ator, processo.id, { dataPrevista: "2026-12-20", dataEmbalagem: "2026-12-18" });
    const salvo = await prisma.processo.findUnique({ where: { id: processo.id } });
    expect(salvo?.dataPretendida?.toISOString().slice(0, 10)).toBe("2026-12-01");
    expect(salvo?.dataPrevista?.toISOString().slice(0, 10)).toBe("2026-12-20");
    expect(JSON.stringify(salvo?.extras)).toContain("2026-12-18");
  });
});
