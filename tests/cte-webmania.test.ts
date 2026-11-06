import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as webhook } from "@/app/api/webmania/cte/route";
import { prisma } from "@/lib/prisma";
import { duplicarCte, montarRascunhoDoProcesso, obterOuPreencherCte } from "@/server/cte/cte";
import { obterProvedorMdfe } from "@/server/mdfe/provedor";
import { lerRascunho, rascunhoVazio, type RascunhoCte } from "@/server/cte/rascunho";
import { CFOPS } from "@/server/cte/opcoes";
import { montarPayloadWebmania, ProvedorWebmania } from "@/server/cte/webmania";
import { adicionarItens, listarCatalogo } from "@/server/inventario";

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Mdfe", "ItemInventario", "Cte", "Evento", "Processo", "Contato", "Cliente" RESTART IDENTITY CASCADE',
  );
}

function completo(): RascunhoCte {
  const base = rascunhoVazio();
  return {
    ...base,
    cfop: "5353",
    inicioCidade: "Curitiba",
    inicioUf: "PR",
    fimCidade: "São Paulo",
    fimUf: "SP",
    remetente: { ...base.remetente, nome: "Cliente Origem", documento: "11222333000181", endereco: "Rua A", numero: "10", bairro: "Centro", cep: "80000000", cidade: "Curitiba", uf: "PR" },
    destinatario: { ...base.destinatario, nome: "Cliente Destino", documento: "11222333000181", endereco: "Rua B", numero: "20", bairro: "Centro", cep: "01000000", cidade: "São Paulo", uf: "SP" },
    valorServico: 2500,
    valorReceber: 2500,
    valorMercadoria: 8000,
    cubagemM3: 12.5,
    rntrc: "12345678",
    documentos: [{ tipo: 3, chave: null, numero: "DECL-1" }],
    ibsSituacao: "000",
    ibsClassificacao: "000001",
    veiculo: "ABC1D23",
    motorista: "João",
    naturezaOperacao: "Prestação de serviço de transporte de mudança",
  };
}

beforeEach(limpar);
afterEach(() => {
  delete process.env.WEBMANIA_ACCESS_TOKEN;
  delete process.env.WEBMANIA_WEBHOOK_TOKEN;
  delete process.env.WEBMANIA_AMBIENTE;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("CT-e WebmaniaBR", () => {
  it("monta o JSON da API e não envia, mesmo com token de homologação", async () => {
    expect(CFOPS.map((item) => item.id)).toEqual(expect.arrayContaining(["5350", "5362", "6353", "6932", "7358", "5206"]));
    process.env.WEBMANIA_AMBIENTE = "2";
    process.env.WEBMANIA_ACCESS_TOKEN = "token-de-teste";
    const montado = montarPayloadWebmania(completo());
    expect(montado.pendencias).toEqual([]);
    expect(montado.payload).toMatchObject({
      ambiente: 2,
      modelo: "cte",
      modalidade: 1,
      finalidade: 0,
      indicador_tomador: 0,
      servico: { valor_total: 2500, valor_recebido: 2500, tipo: 0 },
      carga: { quantidades: [{ quantidade: 12.5, unidade_medida: 0, tipo_medida: "CUBAGEM" }] },
      rodoviario: { rntrc: "12345678" },
      impostos: { cfop: "5353", ibs_cbs: { situacao_tributaria: "000", classificacao_tributaria: "000001" } },
    });
    expect(montado.payload).not.toHaveProperty("natureza_operacao");
    expect(montado.payload).not.toHaveProperty("destinatário");
    expect(JSON.stringify(montado.payload)).not.toContain("PESO");
    expect(montado.payload.rodoviario).not.toHaveProperty("veiculo");

    const provedor = new ProvedorWebmania();
    const pedido = provedor.prepararEmissao(completo());
    expect(pedido.enviado).toBe(false);
    expect(pedido.url).toBe("https://api.webmania.com.br/2/cte/emissao");
    expect(pedido.cabecalhos.Authorization).toBe("Bearer [WEBMANIA_ACCESS_TOKEN]");
    await expect(provedor.emitir(completo())).rejects.toMatchObject({ codigo: "EMISSAO_ADIADA" });
    await expect(obterProvedorMdfe().emitir({
      ufInicio: null,
      ufFim: null,
      percurso: [],
      carregamento: [],
      descarregamento: [],
      placa: null,
      renavam: null,
      taraKg: null,
      capacidadeKg: null,
      capacidadeM3: null,
      condutorNome: null,
      condutorCpf: null,
      rntrc: null,
      seguradoraNome: null,
      seguradoraCnpj: null,
      apolice: null,
      averbacoes: [],
      valorCarga: null,
      pesoBruto: null,
    })).rejects.toMatchObject({ codigo: "DADOS_INVALIDOS" });
  });

  it("preenche cubagem pelo inventário e permite duplicar o rascunho", async () => {
    const cliente = await prisma.cliente.create({ data: { nome: "Casa Nova", cnpj: "11222333000181" } });
    const processo = await prisma.processo.create({
      data: {
        codigo: "MB-CTE-1",
        titulo: "Mudança com inventário",
        canal: "SITE",
        clienteId: cliente.id,
        origemCidade: "Curitiba",
        origemUf: "PR",
        destinoCidade: "Joinville",
        destinoUf: "SC",
        valorAprovado: 3200,
        valorFrete: 2800,
        motoristaAntt: "87654321",
        motoristaNome: "Carlos",
        motoristaPlaca: "ABC1D23",
      },
    });
    const catalogo = await listarCatalogo();
    const sofa = catalogo.find((item) => item.nome === "Sofá 3 lugares")!;
    const caixa = catalogo.find((item) => item.nome === "Caixa média")!;
    await adicionarItens(processo.id, [
      { catalogoId: sofa.id, comodo: "SALA", quantidade: 1 },
      { catalogoId: caixa.id, comodo: "QUARTO", quantidade: 2 },
    ]);
    const cte = await obterOuPreencherCte(processo.id);
    const rascunho = lerRascunho(cte.rascunho);
    expect(rascunho.cubagemM3).toBe(2.36);
    expect(rascunho.produtoPredominante).toBe("Sofá 3 lugares");
    expect(rascunho.valorServico).toBe(3200);
    expect(rascunho.rntrc).toBe("87654321");
    expect(rascunho.veiculo).toBe("ABC1D23");
    expect(cte.finalidade).toBe(0);
    const copia = await duplicarCte(cte.id);
    expect(copia.id).not.toBe(cte.id);
    expect(await prisma.cte.count({ where: { processoId: processo.id } })).toBe(2);
    const direto = await montarRascunhoDoProcesso(processo.id);
    expect(direto.fimCidade).toBe("Joinville");
  });

  it("recebe o webhook só com o token configurado", async () => {
    const cliente = await prisma.cliente.create({ data: { nome: "Webhook" } });
    const processo = await prisma.processo.create({
      data: { codigo: "MB-CTE-2", titulo: "Webhook", canal: "EMAIL", clienteId: cliente.id },
    });
    const cte = await obterOuPreencherCte(processo.id);
    await prisma.cte.update({ where: { id: cte.id }, data: { chave: "1".repeat(44) } });
    const corpo = {
      uuid: "00000000-0000-0000-0000-000000000000",
      chave: "1".repeat(44),
      serie: 1,
      numero: 123,
      status: "aprovado",
      motivo: "Autorizado o uso do CT-e",
      xml: "https://api.webmania.com.br/xmlcte/1",
      dacte: "https://api.webmania.com.br/dacte/1",
    };
    const negado = await webhook(new Request("http://localhost/api/webmania/cte?token=errado", { method: "POST", body: JSON.stringify(corpo) }));
    expect(negado.status).toBe(401);
    process.env.WEBMANIA_WEBHOOK_TOKEN = "segredo-webhook";
    const aceito = await webhook(
      new Request("http://localhost/api/webmania/cte?token=segredo-webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      }),
    );
    expect(aceito.status).toBe(200);
    const atualizado = await prisma.cte.findUnique({ where: { id: cte.id } });
    expect(atualizado?.status).toBe("AUTORIZADO");
    expect(atualizado?.dacteUrl).toBe("https://api.webmania.com.br/dacte/1");
    expect(atualizado?.numero).toBe("123");
  });
});
