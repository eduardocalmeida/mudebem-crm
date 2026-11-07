import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { abrirConversaDoProcesso, espelharWhatsapp, registrarMensagem } from "@/server/conversas";

beforeEach(async () => {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") {
    throw new Error(`Teste apontou para o banco ${linhas[0]?.current_database}.`);
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Mensagem", "Conversa", "MensagemWhatsapp", "ConversaWhatsapp", "NumeroWhatsapp", "Processo", "Contato", "Cliente", "Usuario" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("conversas", () => {
  it("numera o fio e espelha a mensagem de WhatsApp sem apagar a caixa da Meta", async () => {
    const cliente = await prisma.cliente.create({ data: { nome: "Casa Verde" } });
    const processo = await prisma.processo.create({
      data: { codigo: "MB-CV-1", titulo: "Mudança da Casa Verde", canal: "WHATSAPP", clienteId: cliente.id },
    });
    const numero = await prisma.numeroWhatsapp.create({
      data: { nome: "Comercial", phoneNumberId: "phone-conversa", numeroExibicao: "+55 11 4000-2026" },
    });
    const whatsapp = await prisma.conversaWhatsapp.create({
      data: {
        numeroId: numero.id,
        waId: "5511999990000",
        nomeContato: "Ana",
        processoId: processo.id,
        ultimaMensagem: "Oi",
        ultimaMensagemEm: new Date("2026-11-06T12:00:00Z"),
        naoLida: true,
      },
    });
    await prisma.mensagemWhatsapp.create({
      data: {
        conversaId: whatsapp.id,
        wamid: "wamid-1",
        direcao: "ENTRADA",
        tipo: "TEXTO",
        texto: "Oi",
        status: "RECEBIDA",
        criadaEm: new Date("2026-11-06T12:00:00Z"),
      },
    });

    await espelharWhatsapp(whatsapp.id);
    await espelharWhatsapp(whatsapp.id);

    const espelhada = await prisma.conversa.findFirst({
      where: { processoId: processo.id },
      include: { mensagens: true, whatsapp: true },
    });
    expect(espelhada?.numero).toMatch(/^A\d{5}$/);
    expect(espelhada?.canal).toBe("WHATSAPP");
    expect(espelhada?.mensagens).toHaveLength(1);
    expect(espelhada?.mensagens[0]?.conteudo).toBe("Oi");
    expect(espelhada?.whatsapp?.id).toBe(whatsapp.id);
    expect(await prisma.mensagemWhatsapp.count()).toBe(1);

    const manual = await abrirConversaDoProcesso(processo.id, null);
    expect(manual.id).toBe(espelhada?.id);
    await registrarMensagem({ conversaId: manual.id, canal: "TELEFONE", direcao: "SAIDA", conteudo: "Liguei e confirmei a coleta.", remetente: "Ana Costa" });
    const fio = await prisma.mensagem.findMany({ where: { conversaId: manual.id }, orderBy: { criadaEm: "asc" } });
    expect(fio.map((mensagem) => mensagem.canal)).toEqual(["WHATSAPP", "TELEFONE"]);
  });
});