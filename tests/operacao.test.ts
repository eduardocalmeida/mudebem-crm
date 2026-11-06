import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hashSenha } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { emitirCte, obterOuPreencherCte } from "@/server/cte/cte";
import { lerRascunho } from "@/server/cte/rascunho";
import { adicionarItens, listarCatalogo } from "@/server/inventario";
import { moverEtapa } from "@/server/processos";
import { tarefaAtrasada } from "@/server/tarefas";

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ItemInventario", "Cte", "Tarefa", "Anexo", "Evento", "Processo", "Contato", "Cliente", "Usuario" RESTART IDENTITY CASCADE',
  );
}

beforeEach(limpar);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("tarefas, inventário e CT-e", () => {
  it("marca tarefa vencida e cria tarefa ao mudar de etapa", async () => {
    expect(tarefaAtrasada(new Date("2020-01-01T00:00:00Z"), null, new Date("2026-01-01T00:00:00Z"))).toBe(true);
    expect(tarefaAtrasada(new Date("2020-01-01T00:00:00Z"), new Date(), new Date())).toBe(false);

    const usuario = await prisma.usuario.create({
      data: { nome: "Ana", email: "ana-op@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "ADMIN" },
    });
    const cliente = await prisma.cliente.create({ data: { nome: "Cliente Operação", cnpj: null } });
    const processo = await prisma.processo.create({
      data: {
        codigo: "MB-OP-1",
        titulo: "Mudança de teste",
        canal: "INDICACAO",
        clienteId: cliente.id,
        responsavelId: usuario.id,
        origemCidade: "Curitiba",
        origemUf: "PR",
        destinoCidade: "São Paulo",
        destinoUf: "SP",
      },
    });

    await moverEtapa({ tipo: "usuario", id: usuario.id, nome: usuario.nome, papel: "ADMIN" }, processo.id, "PROPOSTA");
    const tarefas = await prisma.tarefa.findMany({ where: { processoId: processo.id }, include: { tipo: true } });
    expect(tarefas.map((tarefa) => tarefa.tipo.slug)).toContain("ENVIAR_PROPOSTA");
  });

  it("soma o inventário e grava o volume do processo", async () => {
    const catalogo = await listarCatalogo();
    expect(catalogo.length).toBeGreaterThanOrEqual(80);
    const sofa = catalogo.find((item) => item.nome === "Sofá 3 lugares");
    expect(sofa?.volumeM3.toNumber()).toBe(2.2);

    const cliente = await prisma.cliente.create({ data: { nome: "Cliente Volume" } });
    const processo = await prisma.processo.create({
      data: { codigo: "MB-OP-2", titulo: "Volume", canal: "SITE", clienteId: cliente.id },
    });
    await adicionarItens(processo.id, [
      { catalogoId: sofa!.id, comodo: "SALA", quantidade: 1, desmontagem: true },
      { nome: "Piano de cauda", volumeM3: 2.5, comodo: "SALA", quantidade: 1, fragil: true },
    ]);
    const atualizado = await prisma.processo.findUnique({ where: { id: processo.id } });
    expect(atualizado?.volume).toBe("4,70 m³");
  });

  it("preenche o CT-e com o processo e recusa emitir sem provedor", async () => {
    const cliente = await prisma.cliente.create({ data: { nome: "Remetente LTDA", cnpj: "11222333000181" } });
    const processo = await prisma.processo.create({
      data: {
        codigo: "MB-OP-3",
        titulo: "CT-e",
        canal: "WHATSAPP",
        clienteId: cliente.id,
        origemCidade: "Londrina",
        origemUf: "PR",
        destinoCidade: "Maringá",
        destinoUf: "PR",
        volume: "4,70 m³",
        valorFrete: 1800,
      },
    });
    const cte = await obterOuPreencherCte(processo.id);
    expect(cte.municipioInicio).toBe("Londrina");
    expect(cte.municipioFim).toBe("Maringá");
    expect(cte.modal).toBe("01");
    expect(cte.status).toBe("RASCUNHO");
    expect(Number(cte.valorPrestacao)).toBe(1800);
    const rascunho = lerRascunho(cte.rascunho);
    expect(rascunho.cubagemM3).toBe(4.7);
    expect(rascunho.remetente.nome).toBe("Remetente LTDA");
    expect(rascunho.destinatario.cidade).toBe("Maringá");
    await expect(emitirCte(processo.id)).rejects.toMatchObject({ status: 501, codigo: "PROVEDOR_AUSENTE" });
  });
});
