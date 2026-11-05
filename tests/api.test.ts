import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as indice } from "@/app/api/v1/route";
import { GET as etapas } from "@/app/api/v1/etapas/route";
import { GET as listarProcessos, POST as criarProcesso } from "@/app/api/v1/processos/route";
import { GET as obterProcesso, PATCH as atualizarProcesso } from "@/app/api/v1/processos/[id]/route";
import { POST as criarNota } from "@/app/api/v1/processos/[id]/notas/route";
import { POST as moverEtapa } from "@/app/api/v1/processos/[id]/etapa/route";
import { GET as listarClientes, POST as criarCliente } from "@/app/api/v1/clientes/route";
import { POST as criarContato } from "@/app/api/v1/clientes/[id]/contatos/route";
import { gerarChaveApi } from "@/lib/api-key";
import { hashSenha } from "@/lib/password";
import { prisma } from "@/lib/prisma";

let chave = "";

function cnpjValido(base12: string) {
  const calcular = (base: string, fatores: number[]) => {
    const soma = fatores.reduce((total, fator, indice) => total + Number(base[indice]) * fator, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = calcular(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcular(base12 + String(primeiro), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base12}${primeiro}${segundo}`;
}

function pedido(caminho: string, metodo: string, opcoes?: { chave?: string | null; corpo?: unknown; header?: "bearer" | "x-api-key" }) {
  const headers = new Headers();
  const token = opcoes?.chave === undefined ? chave : opcoes.chave;
  if (token) {
    if (opcoes?.header === "x-api-key") headers.set("x-api-key", token);
    else headers.set("authorization", `Bearer ${token}`);
  }
  if (opcoes?.corpo !== undefined) headers.set("content-type", "application/json");
  return new NextRequest(new URL(caminho, "http://localhost"), {
    method: metodo,
    headers,
    body: opcoes?.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
  });
}

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") {
    throw new Error(`Teste apontou para o banco ${linhas[0]?.current_database}, não para mudebem_test.`);
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MensagemWhatsapp", "ConversaWhatsapp", "NumeroWhatsapp", "ConfigWhatsapp", "Anexo", "Evento", "Processo", "Contato", "Cliente", "ChaveApi", "Usuario" RESTART IDENTITY CASCADE',
  );
  const senhaHash = await hashSenha("senha-de-teste");
  const usuario = await prisma.usuario.create({
    data: { nome: "Integração Teste", email: "integracao@mudebem.test", senhaHash, papel: "ADMIN" },
  });
  const gerada = gerarChaveApi();
  chave = gerada.chave;
  await prisma.chaveApi.create({
    data: { nome: "Teste", prefixo: gerada.prefixo, hash: gerada.hash, criadaPorId: usuario.id },
  });
}

beforeEach(limpar);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("API de processos", () => {
  it("rejeita chamada sem chave e com chave inválida", async () => {
    const semChave = await listarProcessos(pedido("/api/v1/processos", "GET", { chave: null }));
    const invalida = await listarProcessos(pedido("/api/v1/processos", "GET", { chave: "mb_live_nao_existe" }));
    expect(semChave.status).toBe(401);
    expect(invalida.status).toBe(401);
    expect(await semChave.json()).toMatchObject({ codigo: "NAO_AUTORIZADO" });
  });

  it("rejeita chave revogada", async () => {
    await prisma.chaveApi.updateMany({ data: { revogadaEm: new Date() } });
    const resposta = await indice(pedido("/api/v1", "GET"));
    expect(resposta.status).toBe(401);
  });

  it("cria processo com cliente aninhado, atualiza, anota e move a etapa", async () => {
    const invalido = await criarProcesso(pedido("/api/v1/processos", "POST", { corpo: { titulo: "x" } }));
    expect(invalido.status).toBe(400);

    const criado = await criarProcesso(
      pedido("/api/v1/processos", "POST", {
        header: "x-api-key",
        corpo: {
          titulo: "Mudança da colaboradora Helena",
          canal: "EMAIL",
          cliente: { nome: "Atlas Logística Ltda", cidade: "São Paulo", uf: "SP" },
          contato: { nome: "Helena Dias", email: "helena@atlas.example", telefone: "(11) 98888-0000" },
          colaborador: "Helena Dias",
          origemCidade: "São Paulo",
          origemUf: "SP",
          destinoCidade: "Santos",
          destinoUf: "SP",
          dataColeta: "2026-12-02",
          valorCotado: "8.500,00",
          inventario: "Apartamento de 2 quartos.",
        },
      }),
    );
    expect(criado.status).toBe(201);
    const processo = await criado.json();
    expect(processo.codigo).toMatch(/^MB-\d{4}-\d{4}$/);
    expect(processo.cliente.nome).toBe("Atlas Logística Ltda");
    expect(processo.contato.email).toBe("helena@atlas.example");
    expect(processo.valorCotado).toBe(8500);
    expect(processo.dataColeta).toBe("2026-12-02");
    expect(processo.etapa).toBe("LEADS_DE_ENTRADA");
    expect(processo.eventos[0].tipo).toBe("CRIACAO");

    const contexto = { params: Promise.resolve({ id: processo.id as string }) };
    const etapaNoPatch = await atualizarProcesso(
      pedido(`/api/v1/processos/${processo.id}`, "PATCH", { corpo: { etapa: "PRECIFICACAO" } }),
      contexto,
    );
    expect(etapaNoPatch.status).toBe(400);
    expect((await etapaNoPatch.json()).erro).toMatch(/etapa/i);

    const patch = await atualizarProcesso(
      pedido(`/api/v1/processos/${processo.id}`, "PATCH", {
        corpo: {
          valorAprovado: 7900,
          numeroOc: "OC-100",
          dataColeta: "12/12/2026",
          inventario: "Apartamento de 2 quartos e uma bicicleta.",
        },
      }),
      contexto,
    );
    expect(patch.status).toBe(200);
    const atualizado = await patch.json();
    expect(atualizado.valorAprovado).toBe(7900);
    expect(atualizado.numeroOc).toBe("OC-100");
    expect(atualizado.dataColeta).toBe("2026-12-12");

    const nota = await criarNota(
      pedido(`/api/v1/processos/${processo.id}/notas`, "POST", { corpo: { texto: "Cliente pediu coleta após as 14h." } }),
      contexto,
    );
    expect(nota.status).toBe(201);
    expect((await nota.json()).nota.texto).toMatch(/14h/);

    const movimento = await moverEtapa(
      pedido(`/api/v1/processos/${processo.id}/etapa`, "POST", {
        corpo: { etapa: "PRECIFICACAO", observacao: "Vistoria concluída." },
      }),
      contexto,
    );
    expect(movimento.status).toBe(200);
    const movido = await movimento.json();
    expect(movido.etapaAnterior).toBe("LEADS_DE_ENTRADA");
    expect(movido.processo.etapa).toBe("PRECIFICACAO");

    const detalhe = await obterProcesso(pedido(`/api/v1/processos/${processo.id}`, "GET"), contexto);
    const corpo = await detalhe.json();
    expect(corpo.etapa).toBe("PRECIFICACAO");
    expect(corpo.eventos.some((evento: { tipo: string }) => evento.tipo === "NOTA")).toBe(true);
    expect(corpo.eventos.some((evento: { tipo: string }) => evento.tipo === "MUDANCA_ETAPA")).toBe(true);

    const lista = await listarProcessos(pedido("/api/v1/processos?etapa=PRECIFICACAO&q=Helena", "GET"));
    const listagem = await lista.json();
    expect(lista.status).toBe(200);
    expect(listagem.total).toBe(1);
    expect(listagem.dados[0].codigo).toBe(processo.codigo);

    const catalogo = await etapas(pedido("/api/v1/etapas", "GET"));
    const fluxo = await catalogo.json();
    expect(fluxo.fluxo.map((item: { id: string }) => item.id)).toContain("CONTAS_A_RECEBER");
    expect(fluxo.terminais.map((item: { id: string }) => item.id)).toContain("PERDIDO");
  });

  it("cadastra cliente e contato", async () => {
    const resposta = await criarCliente(
      pedido("/api/v1/clientes", "POST", {
        corpo: { nome: "Oficina Serra Azul", cnpj: cnpjValido("112223330001"), cidade: "Curitiba", uf: "PR" },
      }),
    );
    expect(resposta.status).toBe(201);
    const cliente = await resposta.json();
    expect(cliente.cnpj).toHaveLength(14);

    const contato = await criarContato(
      pedido(`/api/v1/clientes/${cliente.id}/contatos`, "POST", {
        corpo: { nome: "Igor Serra", email: "igor@serra.example", principal: true },
      }),
      { params: Promise.resolve({ id: cliente.id as string }) },
    );
    expect(contato.status).toBe(201);

    const lista = await listarClientes(pedido("/api/v1/clientes?q=Serra", "GET"));
    expect((await lista.json()).dados).toHaveLength(1);
  });

  it("recusa CNPJ inválido", async () => {
    const resposta = await criarCliente(
      pedido("/api/v1/clientes", "POST", { corpo: { nome: "Empresa Inválida", cnpj: "11.111.111/1111-11" } }),
    );
    expect(resposta.status).toBe(400);
  });
});
