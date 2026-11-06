import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/publico/orcamento/route";
import { GET as script } from "@/app/formulario.js/route";
import { middleware } from "@/middleware";
import { prisma } from "@/lib/prisma";
import { listarCatalogo } from "@/server/inventario";
import { limparLimiteFormulario, LIMITE_ENVIOS_FORMULARIO } from "@/server/formulario-publico";

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  limparLimiteFormulario();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ItemInventario", "Tarefa", "Cte", "Anexo", "Evento", "Processo", "Contato", "Cliente" RESTART IDENTITY CASCADE',
  );
}

function pedido(corpo: unknown, ip = "203.0.113.10") {
  return new NextRequest("http://localhost/api/publico/orcamento", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(corpo),
  });
}

beforeEach(limpar);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("formulário público", () => {
  it("deixa a página e o script públicos e cria o lead com volume e campanha", async () => {
    const semSessao = await middleware(new NextRequest("http://localhost/orcamento"));
    expect(semSessao.headers.get("location")).toBeNull();
    const js = await script(new Request("http://crm.mudebem.test/formulario.js"));
    const texto = await js.text();
    expect(texto).toContain('var origem = "http://crm.mudebem.test"');
    expect(texto).toContain('quadro.src = origem + "/orcamento?"');
    expect(texto).toContain("utm_source");
    expect(texto).toContain("document.referrer");

    const catalogo = await listarCatalogo();
    const sofa = catalogo.find((item) => item.nome === "Sofá 3 lugares");
    const resposta = await POST(
      pedido({
        nome: "Marina Alves",
        email: "marina.alves@example.com",
        telefone: "(41) 98888-1212",
        origemCidade: "Curitiba",
        origemUf: "PR",
        origemImovel: "Apartamento",
        origemAndar: "7",
        origemElevador: "Sim",
        destinoCidade: "São Paulo",
        destinoUf: "SP",
        dataPretendida: "2026-12-10",
        utmSource: "google",
        utmMedium: "cpc",
        gclid: "EAIa-exemplo",
        fbclid: "IwAR-exemplo",
        referrer: "https://www.google.com/",
        itens: [{ catalogoId: sofa!.id, comodo: "SALA", quantidade: 2 }],
      }),
    );
    expect(resposta.status).toBe(201);
    const corpo = await resposta.json();
    expect(corpo.volume).toBe("4,40 m³");
    expect(corpo.atualizado).toBe(false);
    const processo = await prisma.processo.findFirst({
      where: { codigo: corpo.codigo },
      include: { contato: true, itensInventario: true },
    });
    expect(processo?.etapa).toBe("LEADS_DE_ENTRADA");
    expect(processo?.canal).toBe("SITE");
    expect(processo?.utmSource).toBe("google");
    expect(processo?.gclid).toBe("EAIa-exemplo");
    expect(processo?.fbclid).toBe("IwAR-exemplo");
    expect(processo?.referrer).toBe("https://www.google.com/");
    expect(processo?.origemAndar).toBe("7");
    expect(processo?.contato?.email).toBe("marina.alves@example.com");
    expect(processo?.itensInventario).toHaveLength(1);
    expect(processo?.itensInventario[0]?.quantidade).toBe(2);
  });

  it("atualiza o contato e o lead ainda em entrada, e ignora o honeypot", async () => {
    const catalogo = await listarCatalogo();
    const cadeira = catalogo.find((item) => item.nome === "Cadeira");
    const primeira = await POST(
      pedido({
        nome: "Marina",
        email: "marina.alves@example.com",
        origemCidade: "Curitiba",
        origemUf: "PR",
        destinoCidade: "Londrina",
        destinoUf: "PR",
        itens: [{ catalogoId: cadeira!.id, comodo: "COZINHA", quantidade: 4 }],
      }, "203.0.113.20"),
    );
    expect(primeira.status).toBe(201);

    const segunda = await POST(
      pedido({
        nome: "Marina Alves",
        email: "Marina.Alves@example.com",
        telefone: "(41) 97777-0000",
        origemCidade: "Curitiba",
        origemUf: "PR",
        destinoCidade: "Maringá",
        destinoUf: "PR",
        itens: [{ catalogoId: cadeira!.id, comodo: "SALA", quantidade: 1 }],
      }, "203.0.113.20"),
    );
    expect(segunda.status).toBe(201);
    const corpo = await segunda.json();
    expect(corpo.atualizado).toBe(true);
    const processos = await prisma.processo.findMany({ include: { contato: true, itensInventario: true } });
    expect(processos).toHaveLength(1);
    expect(processos[0]?.destinoCidade).toBe("Maringá");
    expect(processos[0]?.contato?.nome).toBe("Marina Alves");
    expect(processos[0]?.itensInventario).toHaveLength(1);
    expect(processos[0]?.itensInventario[0]?.comodo).toBe("SALA");
    expect(processos[0]?.volume).toBe("0,15 m³");

    const comEndereco = await POST(
      pedido({
        nome: "Helena Dias",
        email: "helena.dias@example.com",
        telefone: "(62) 98888-1010",
        dataPretendida: "2026-12-20",
        origemCep: "01310-100",
        origemLogradouro: "Avenida Paulista",
        origemNumero: "1000",
        origemComplemento: "ap 12",
        origemBairro: "Bela Vista",
        origemCidade: "São Paulo",
        origemUf: "SP",
        origemImovel: "Apartamento",
        origemAndar: "8",
        origemElevador: "Sim",
        origemReferencia: "Em frente à praça",
        destinoCep: "74000-000",
        destinoLogradouro: "Rua 3",
        destinoNumero: "50",
        destinoBairro: "Setor Central",
        destinoCidade: "Goiânia",
        destinoUf: "GO",
        destinoImovel: "Casa",
        comoConheceu: "Indicação",
        transferenciaEmpresa: true,
        empresaTrabalho: "Atvos",
        itens: [{ catalogoId: cadeira!.id, comodo: "SALA", quantidade: 1 }],
      }, "203.0.113.40"),
    );
    expect(comEndereco.status).toBe(201);
    const gravado = await prisma.processo.findFirst({ where: { contato: { email: "helena.dias@example.com" } } });
    expect(gravado?.etapa).toBe("LEADS_DE_ENTRADA");
    expect(gravado?.origemEndereco).toContain("Avenida Paulista, 1000");
    expect(gravado?.origemEndereco).toContain("Bela Vista");
    expect(gravado?.destinoEndereco).toContain("Rua 3, 50");
    expect(gravado?.origemAndar).toBe("8");
    expect(gravado?.destinoImovel).toBe("Casa");
    expect(gravado?.fonte).toBe("Indicação");
    expect(gravado?.itensEspeciais).toContain("Empresa: Atvos");
    expect(JSON.stringify(gravado?.extras)).not.toContain("token");

    const isca = await POST(pedido({ nome: "Robô", email: "robo@example.com", website: "http://spam.test" }, "203.0.113.21"));
    expect(isca.status).toBe(200);
    expect(await prisma.processo.count()).toBe(2);
  });

  it("limita envios repetidos do mesmo IP", async () => {
    const ip = "203.0.113.30";
    for (let i = 0; i < LIMITE_ENVIOS_FORMULARIO; i += 1) {
      const resposta = await POST(pedido({ nome: `Pessoa ${i}`, email: `pessoa${i}@example.com` }, ip));
      expect(resposta.status).toBe(201);
    }
    const extra = await POST(pedido({ nome: "Pessoa extra", email: "extra@example.com" }, ip));
    expect(extra.status).toBe(429);
    expect(await extra.json()).toMatchObject({ codigo: "LIMITE" });
  });
});
