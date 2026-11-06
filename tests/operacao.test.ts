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
    'TRUNCATE TABLE "Mensagem", "Conversa", "ItemInventario", "Cte", "Tarefa", "Anexo", "Evento", "Processo", "Contato", "Cliente", "Usuario" RESTART IDENTITY CASCADE',
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
    const proposta = tarefas.find((tarefa) => tarefa.tipo.slug === "ENVIAR_PROPOSTA");
    expect(proposta).toBeTruthy();
    const horas = (proposta!.vencimento.getTime() - Date.now()) / 3_600_000;
    expect(horas).toBeGreaterThan(3.5);
    expect(horas).toBeLessThan(4.5);

    await prisma.regraTarefa.update({
      where: { etapaSlug_tipoId: { etapaSlug: "PROPOSTA", tipoId: "ENVIAR_PROPOSTA" } },
      data: { horasDepois: 6, titulo: "Enviar a proposta revisada", ativa: true },
    });
    const outro = await prisma.processo.create({
      data: { codigo: "MB-OP-1B", titulo: "Segunda mudança", canal: "EMAIL", clienteId: cliente.id },
    });
    const antes = Date.now();
    await moverEtapa({ tipo: "usuario", id: usuario.id, nome: usuario.nome, papel: "ADMIN" }, outro.id, "PROPOSTA");
    const salva = await prisma.tarefa.findFirst({ where: { processoId: outro.id, tipoId: "ENVIAR_PROPOSTA" } });
    expect(salva?.titulo).toBe("Enviar a proposta revisada");
    const prazo = (salva!.vencimento.getTime() - antes) / 3_600_000;
    expect(prazo).toBeGreaterThan(5.5);
    expect(prazo).toBeLessThan(6.5);
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
    expect(cte.ufInicio).toBe("PR");
    expect(cte.emitenteMunicipio).toBe("Goiânia");
    expect(cte.emitenteUf).toBe("GO");
    expect(cte.municipioFim).toBe("Maringá");
    expect(cte.modal).toBe("01");
    expect(cte.status).toBe("RASCUNHO");
    expect(Number(cte.valorPrestacao)).toBe(1800);
    const rascunho = lerRascunho(cte.rascunho);
    expect(rascunho.cubagemM3).toBe(4.7);
    expect(rascunho.remetente.nome).toBe("Remetente LTDA");
    expect(rascunho.destinatario.cidade).toBe("Maringá");
    await expect(emitirCte(processo.id)).rejects.toMatchObject({ status: 501, codigo: "PROVEDOR_AUSENTE" });

    const semUf = await prisma.processo.create({
      data: { codigo: "MB-OP-4", titulo: "Sem UF", canal: "EMAIL", clienteId: cliente.id, origemCidade: "Anápolis" },
    });
    const cteGo = await obterOuPreencherCte(semUf.id);
    expect(cteGo.ufInicio).toBe("GO");
    expect(lerRascunho(cteGo.rascunho).remetente.uf).toBe("GO");
  });
});
