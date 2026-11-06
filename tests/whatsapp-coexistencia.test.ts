import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as receber } from "@/app/api/whatsapp/webhook/route";
import { prisma } from "@/lib/prisma";
import { assinarCorpo } from "@/lib/whatsapp";
import { concluirEmbeddedSignup, solicitarSincronismo } from "@/server/whatsapp-signup";

const SEGREDO = "segredo-do-app-de-teste";

function webhook(payload: unknown) {
  const corpo = JSON.stringify(payload);
  return new Request("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": assinarCorpo(corpo, SEGREDO) },
    body: corpo,
  });
}

beforeEach(async () => {
  process.env.WHATSAPP_APP_SECRET = SEGREDO;
  process.env.WHATSAPP_VERIFY_TOKEN = "token-de-verificacao";
  process.env.WHATSAPP_APP_ID = "app-teste";
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_WABA_ID;
  delete process.env.WHATSAPP_NUMERO_1_ID;
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Mensagem", "Conversa", "MensagemWhatsapp", "ConversaWhatsapp", "NumeroWhatsapp", "ConfigWhatsapp", "Anexo", "Evento", "Processo", "Contato", "Cliente", "ChaveApi", "Usuario" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("histórico da coexistência", () => {
  it("importa conversas antigas sem abrir processo e marca a mensagem da empresa como saída", async () => {
    await prisma.numeroWhatsapp.create({
      data: {
        nome: "Comercial",
        phoneNumberId: "phone-coex",
        numeroExibicao: "+55 11 98821-3344",
        coexistencia: true,
        coexistenciaAtivadoEm: new Date(),
        historicoStatus: "sincronizando",
      },
    });
    const payload = {
      entry: [
        {
          changes: [
            {
              field: "history",
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: "phone-coex", display_phone_number: "5511988213344" },
                history: [
                  {
                    metadata: { phase: 1, chunk_order: 1, progress: 100 },
                    threads: [
                      {
                        id: "5511991112222",
                        messages: [
                          {
                            from: "5511991112222",
                            id: "wamid.hist.cliente",
                            timestamp: "1700000000",
                            type: "text",
                            text: { body: "Mensagem antiga do cliente" },
                            history_context: { status: "READ" },
                          },
                          {
                            from: "5511988213344",
                            id: "wamid.hist.empresa",
                            timestamp: "1700000100",
                            type: "text",
                            text: { body: "Resposta pelo aplicativo" },
                            history_context: { from_me: true, status: "DELIVERED" },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect((await receber(webhook(payload))).status).toBe(200);
    expect(await prisma.processo.count()).toBe(0);
    const conversa = await prisma.conversaWhatsapp.findFirstOrThrow({ include: { mensagens: { orderBy: { criadaEm: "asc" } } } });
    expect(conversa.waId).toBe("5511991112222");
    expect(conversa.processoId).toBeNull();
    expect(conversa.naoLida).toBe(false);
    expect(conversa.mensagens.map((mensagem) => mensagem.direcao)).toEqual(["ENTRADA", "SAIDA"]);
    const numero = await prisma.numeroWhatsapp.findUniqueOrThrow({ where: { phoneNumberId: "phone-coex" } });
    expect(numero.historicoStatus).toBe("concluido");
    expect(numero.historicoProgresso).toBe(100);

    const deNovo = await receber(webhook(payload));
    expect(deNovo.status).toBe(200);
    expect(await prisma.mensagemWhatsapp.count()).toBe(2);
  });

  it("registra quando a empresa não compartilha o histórico", async () => {
    await prisma.numeroWhatsapp.create({
      data: { nome: "Comercial", phoneNumberId: "phone-coex", numeroExibicao: "+55 11 90000-0000", coexistencia: true },
    });
    const payload = {
      entry: [
        {
          changes: [
            {
              field: "history",
              value: {
                metadata: { phone_number_id: "phone-coex" },
                history: [{ errors: [{ code: 2593109, title: "History sync is turned off by the business" }] }],
              },
            },
          ],
        },
      ],
    };
    expect((await receber(webhook(payload))).status).toBe(200);
    const numero = await prisma.numeroWhatsapp.findUniqueOrThrow({ where: { phoneNumberId: "phone-coex" } });
    expect(numero.historicoStatus).toBe("recusado");
    expect(await prisma.conversaWhatsapp.count()).toBe(0);
  });

  it("troca o código do Embedded Signup e pede o histórico só na coexistência", async () => {
    const chamadas: string[] = [];
    const fetchImpl: typeof fetch = async (entrada, init) => {
      const url = String(entrada);
      chamadas.push(`${init?.method ?? "GET"} ${url} ${init?.body ?? ""}`);
      if (url.includes("oauth/access_token")) return Response.json({ access_token: "token-da-waba" });
      if (url.includes("fields=")) return Response.json({ display_phone_number: "+55 11 98821-3344", verified_name: "Mude Bem" });
      if (url.includes("subscribed_apps")) return Response.json({ success: true });
      if (url.includes("smb_app_data")) return Response.json({ success: true });
      return Response.json({});
    };

    const resultado = await concluirEmbeddedSignup(
      { code: "codigo-meta", phoneNumberId: "phone-novo", wabaId: "waba-1", coexistencia: true },
      { fetchImpl },
    );
    expect(resultado.coexistencia).toBe(true);
    expect(resultado.historico?.history).toBe("aceito");
    expect(chamadas.some((chamada) => chamada.includes('"sync_type":"history"'))).toBe(true);
    expect(chamadas.some((chamada) => chamada.includes("smb_app_state_sync"))).toBe(true);
    expect(chamadas.some((chamada) => chamada.includes("/register"))).toBe(false);
    const numero = await prisma.numeroWhatsapp.findUniqueOrThrow({ where: { phoneNumberId: "phone-novo" } });
    expect(numero.coexistencia).toBe(true);
    expect(numero.historicoStatus).toBe("sincronizando");
    expect(numero.numeroExibicao).toBe("+55 11 98821-3344");
    expect(numero.accessToken).toBe("token-da-waba");
  });

  it("recusa um novo pedido de histórico depois de 24 horas", async () => {
    const numero = await prisma.numeroWhatsapp.create({
      data: {
        nome: "Comercial",
        phoneNumberId: "phone-coex",
        numeroExibicao: "+55 11 90000-0000",
        accessToken: "token",
        coexistencia: true,
        coexistenciaAtivadoEm: new Date("2026-11-01T12:00:00.000Z"),
        historicoStatus: "pendente",
      },
    });
    let chamou = false;
    await expect(
      solicitarSincronismo(numero.id, {
        agora: new Date("2026-11-04T12:00:00.000Z"),
        fetchImpl: async () => {
          chamou = true;
          return Response.json({ success: true });
        },
      }),
    ).rejects.toMatchObject({ codigo: "JANELA_HISTORICO" });
    expect(chamou).toBe(false);
    const atual = await prisma.numeroWhatsapp.findUniqueOrThrow({ where: { id: numero.id } });
    expect(atual.historicoStatus).toBe("expirado");
  });
});
