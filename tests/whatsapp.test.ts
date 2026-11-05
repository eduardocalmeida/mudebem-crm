import { createHmac } from "crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as verificar, POST as receber } from "@/app/api/whatsapp/webhook/route";
import { POST as enviar } from "@/app/api/v1/whatsapp/conversas/[id]/mensagens/route";
import { GET as listar } from "@/app/api/v1/whatsapp/conversas/route";
import { gerarChaveApi } from "@/lib/api-key";
import { hashSenha } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { assinarCorpo, dentroDaJanela } from "@/lib/whatsapp";

const SEGREDO = "segredo-do-app-de-teste";
const VERIFY = "token-de-verificacao";

function pedido(caminho: string, metodo: string, corpo?: string, extra?: HeadersInit) {
  return new NextRequest(new URL(caminho, "http://localhost"), {
    method: metodo,
    headers: extra,
    body: corpo,
  });
}

function webhook(payload: unknown, segredo = SEGREDO) {
  const corpo = JSON.stringify(payload);
  return pedido("/api/whatsapp/webhook", "POST", corpo, {
    "content-type": "application/json",
    "x-hub-signature-256": assinarCorpo(corpo, segredo),
  });
}

function mensagem(from: string, id: string, texto: string, phoneNumberId = "phone-teste") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: phoneNumberId, display_phone_number: "551140002026" },
              contacts: [{ profile: { name: "Marina Alves" }, wa_id: from }],
              messages: [
                {
                  from,
                  id,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: texto },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

beforeEach(async () => {
  process.env.WHATSAPP_APP_SECRET = SEGREDO;
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY;
  process.env.WHATSAPP_ACCESS_TOKEN = "token-de-envio";
  delete process.env.WHATSAPP_NUMERO_1_ID;
  delete process.env.WHATSAPP_NUMERO_2_ID;
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") {
    throw new Error(`Teste apontou para o banco ${linhas[0]?.current_database}.`);
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MensagemWhatsapp", "ConversaWhatsapp", "NumeroWhatsapp", "ConfigWhatsapp", "Anexo", "Evento", "Processo", "Contato", "Cliente", "ChaveApi", "Usuario" RESTART IDENTITY CASCADE',
  );
  await prisma.numeroWhatsapp.create({
    data: { nome: "Comercial", phoneNumberId: "phone-teste", numeroExibicao: "+55 11 4000-2026" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("webhook do WhatsApp", () => {
  it("confirma o verify token e recusa um token errado", async () => {
    const ok = await verificar(
      pedido(`/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=12345`, "GET"),
    );
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("12345");

    const ruim = await verificar(
      pedido("/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=outro&hub.challenge=12345", "GET"),
    );
    expect(ruim.status).toBe(403);
  });

  it("recusa POST sem assinatura válida", async () => {
    const corpo = JSON.stringify(mensagem("5511988213344", "wamid.1", "Olá"));
    const sem = await receber(pedido("/api/whatsapp/webhook", "POST", corpo, { "content-type": "application/json" }));
    const adulterada = await receber(
      pedido("/api/whatsapp/webhook", "POST", corpo, {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${createHmac("sha256", "outro").update(corpo).digest("hex")}`,
      }),
    );
    expect(sem.status).toBe(403);
    expect(adulterada.status).toBe(403);
    expect(await prisma.conversaWhatsapp.count()).toBe(0);
  });

  it("cria contato e processo na primeira mensagem e ignora wamid repetido", async () => {
    const primeira = await receber(webhook(mensagem("5511988213344", "wamid.nova", "Quero uma mudança para Campinas")));
    expect(primeira.status).toBe(200);

    const processo = await prisma.processo.findFirst({ include: { contato: true, cliente: true } });
    expect(processo?.etapa).toBe("COTACAO_RECEBIDA");
    expect(processo?.canal).toBe("WHATSAPP");
    expect(processo?.contato?.telefone).toContain("98821");
    expect(processo?.cliente.nome).toBe("Marina Alves");

    const repetida = await receber(webhook(mensagem("5511988213344", "wamid.nova", "Quero uma mudança para Campinas")));
    expect(repetida.status).toBe(200);
    expect(await prisma.processo.count()).toBe(1);
    expect(await prisma.mensagemWhatsapp.count()).toBe(1);

    const segunda = await receber(webhook(mensagem("5511988213344", "wamid.segunda", "Pode ser na sexta?")));
    expect(segunda.status).toBe(200);
    expect(await prisma.processo.count()).toBe(1);
    expect(await prisma.mensagemWhatsapp.count()).toBe(2);
    const conversa = await prisma.conversaWhatsapp.findFirstOrThrow();
    expect(conversa.naoLida).toBe(true);
    expect(conversa.processoId).toBe(processo?.id);
  });

  it("guarda mídia e atualiza o status da mensagem", async () => {
    const imagem = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "phone-teste" },
                contacts: [{ profile: { name: "Paulo Leme" }, wa_id: "5531988770909" }],
                messages: [
                  {
                    from: "5531988770909",
                    id: "wamid.foto",
                    timestamp: "1710000000",
                    type: "image",
                    image: { id: "midia-1", mime_type: "image/jpeg", caption: "Foto da sala" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect((await receber(webhook(imagem))).status).toBe(200);
    const mensagem = await prisma.mensagemWhatsapp.findUniqueOrThrow({ where: { wamid: "wamid.foto" } });
    expect(mensagem.tipo).toBe("IMAGEM");
    expect(mensagem.midiaId).toBe("midia-1");
    expect(mensagem.texto).toBe("Foto da sala");

    const status = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "phone-teste" },
                statuses: [{ id: "wamid.foto", status: "read", timestamp: "1710000001" }],
              },
            },
          ],
        },
      ],
    };
    expect((await receber(webhook(status))).status).toBe(200);
    const atualizada = await prisma.mensagemWhatsapp.findUniqueOrThrow({ where: { wamid: "wamid.foto" } });
    expect(atualizada.status).toBe("LIDA");
  });

  it("ignora número que não está configurado", async () => {
    const resposta = await receber(webhook(mensagem("5511999990000", "wamid.outro", "Oi", "phone-desconhecido")));
    expect(resposta.status).toBe(200);
    expect(await prisma.conversaWhatsapp.count()).toBe(0);
  });
});

describe("envio e janela de 24 horas", () => {
  it("calcula a janela", () => {
    const agora = new Date("2026-11-05T15:00:00.000Z");
    expect(dentroDaJanela(new Date("2026-11-05T14:00:00.000Z"), agora)).toBe(true);
    expect(dentroDaJanela(new Date("2026-11-04T14:00:00.000Z"), agora)).toBe(false);
    expect(dentroDaJanela(null, agora)).toBe(false);
  });

  it("bloqueia texto fora da janela e envia dentro dela", async () => {
    const senhaHash = await hashSenha("senha-de-teste");
    const usuario = await prisma.usuario.create({
      data: { nome: "Agente", email: "agente-wa@mudebem.test", senhaHash, papel: "ADMIN" },
    });
    const gerada = gerarChaveApi();
    await prisma.chaveApi.create({
      data: { nome: "Agente", prefixo: gerada.prefixo, hash: gerada.hash, criadaPorId: usuario.id },
    });
    const numero = await prisma.numeroWhatsapp.findUniqueOrThrow({ where: { phoneNumberId: "phone-teste" } });
    const fechada = await prisma.conversaWhatsapp.create({
      data: {
        numeroId: numero.id,
        waId: "5511900000001",
        ultimaEntradaEm: new Date("2020-01-01T00:00:00.000Z"),
        naoLida: false,
      },
    });
    const aberta = await prisma.conversaWhatsapp.create({
      data: { numeroId: numero.id, waId: "5511900000002", ultimaEntradaEm: new Date(), naoLida: true },
    });

    const bloqueada = await enviar(
      new NextRequest(new URL(`/api/v1/whatsapp/conversas/${fechada.id}/mensagens`, "http://localhost"), {
        method: "POST",
        headers: { authorization: `Bearer ${gerada.chave}`, "content-type": "application/json" },
        body: JSON.stringify({ texto: "Posso falar?" }),
      }),
      { params: Promise.resolve({ id: fechada.id }) },
    );
    expect(bloqueada.status).toBe(409);
    expect((await bloqueada.json()).codigo).toBe("JANELA_ENCERRADA");

    const original = global.fetch;
    global.fetch = (async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid.saida" }] }), { status: 200 })) as typeof fetch;
    try {
      const ok = await enviar(
        new NextRequest(new URL(`/api/v1/whatsapp/conversas/${aberta.id}/mensagens`, "http://localhost"), {
          method: "POST",
          headers: { authorization: `Bearer ${gerada.chave}`, "content-type": "application/json" },
          body: JSON.stringify({ texto: "Recebemos seu pedido." }),
        }),
        { params: Promise.resolve({ id: aberta.id }) },
      );
      expect(ok.status).toBe(201);
      expect((await ok.json()).wamid).toBe("wamid.saida");
    } finally {
      global.fetch = original;
    }

    const lista = await listar(
      new NextRequest(new URL("/api/v1/whatsapp/conversas?naoLidas=sim", "http://localhost"), {
        headers: { authorization: `Bearer ${gerada.chave}` },
      }),
    );
    expect(lista.status).toBe(200);
    const listagem = await lista.json();
    expect(listagem.total).toBe(1);
    expect(listagem.dados[0].id).toBe(aberta.id);
  });
});
