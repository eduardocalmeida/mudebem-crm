import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as webhook } from "@/app/api/webmania/mdfe/route";
import { prisma } from "@/lib/prisma";
import { criarMdfeDoProcesso, emitirMdfe, rascunhoDe } from "@/server/mdfe/mdfe";
import { montarPayloadMdfe, ProvedorWebmaniaMdfe } from "@/server/mdfe/webmania";

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MdfeCte", "Mdfe", "Cte", "Processo", "Contato", "Cliente" RESTART IDENTITY CASCADE',
  );
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

describe("MDF-e rodoviário", () => {
  it("agrupa os CT-e da viagem e monta o JSON da WebmaniaBR sem enviar", async () => {
    const cliente = await prisma.cliente.create({ data: { nome: "Viagem" } });
    const processo = await prisma.processo.create({
      data: {
        codigo: "MB-MDFE-1",
        titulo: "Viagem Curitiba",
        canal: "INDICACAO",
        clienteId: cliente.id,
        origemCidade: "Curitiba",
        origemUf: "PR",
        destinoCidade: "São Paulo",
        destinoUf: "SP",
        motoristaNome: "Carlos Lima",
        motoristaCpf: "12345678901",
        motoristaPlaca: "ABC1D23",
        motoristaAntt: "12345678",
      },
    });
    await prisma.cte.createMany({
      data: [
        { processoId: processo.id, chave: "1".repeat(44), municipioFim: "São Paulo", ufFim: "SP", valorCarga: 4000, quantidadeCarga: 10 },
        { processoId: processo.id, chave: "2".repeat(44), municipioFim: "São Paulo", ufFim: "SP", valorCarga: 1500, quantidadeCarga: 2.5 },
      ],
    });
    const mdfe = await criarMdfeDoProcesso(processo.id);
    expect(mdfe.documentos).toHaveLength(2);
    expect(mdfe.placa).toBe("ABC1D23");
    expect(mdfe.condutorNome).toBe("Carlos Lima");
    expect(mdfe.rntrc).toBe("12345678");
    expect(mdfe.ufInicio).toBe("PR");
    expect(mdfe.municipioCarregamento).toBe("Curitiba");
    expect(Number(mdfe.valorCarga)).toBe(5500);

    const rascunho = rascunhoDe({ ...mdfe, percurso: "MG, RJ", taraKg: 3200, capacidadeKg: 8000, pesoBruto: null, seguradoraNome: "Porto", apolice: "AP-9", averbacao: "AV1, AV2", renavam: "12345678901", capacidadeM3: 40, seguradoraCnpj: null });
    rascunho.pesoBruto = 1800;
    const montado = montarPayloadMdfe(rascunho, 2);
    expect(montado.pendencias).toEqual([]);
    expect(montado.payload).toMatchObject({
      ambiente: 2,
      modalidade: 1,
      uf_carregamento: "PR",
      uf_descarregamento: "SP",
      percurso: ["MG", "RJ"],
      unidade: "01",
      rodoviario: {
        rntrc: "12345678",
        veiculo_tracao: { placa: "ABC1D23", renavam: "12345678901", tara: "3200", capacidade_kg: "8000" },
        condutor: [{ nome: "Carlos Lima", cpf: "12345678901" }],
      },
    });
    const documentos = (montado.payload.descarregamento as { documentos_fiscais: { chave: string }[] }[])[0].documentos_fiscais;
    expect(documentos).toHaveLength(2);
    expect(montado.payload.seguro).toMatchObject([{ numero_apolice: "AP-9", numero_averbacao: ["AV1", "AV2"] }]);

    await expect(emitirMdfe(mdfe.id)).rejects.toMatchObject({ codigo: "PROVEDOR_AUSENTE" });
    process.env.WEBMANIA_ACCESS_TOKEN = "token-de-teste";
    process.env.WEBMANIA_AMBIENTE = "2";
    await prisma.mdfe.update({
      where: { id: mdfe.id },
      data: { percurso: "MG, RJ", taraKg: 3200, capacidadeKg: 8000, pesoBruto: 1800, seguradoraNome: "Porto", apolice: "AP-9", averbacao: "AV1, AV2", renavam: "12345678901" },
    });
    const gravado = await emitirMdfe(mdfe.id);
    expect(gravado.mensagemProvedor).toContain("não envia");
    const pedido = gravado.pedidoPreparado as { enviado: boolean; url: string };
    expect(pedido.enviado).toBe(false);
    expect(pedido.url).toBe("https://api.webmania.com.br/2/mdfe/emissao");

    const provedor = new ProvedorWebmaniaMdfe();
    expect(provedor.prepararEncerramento("1".repeat(44), "SP", "São Paulo").url).toBe("https://api.webmania.com.br/2/mdfe/encerrar");
    expect(provedor.prepararCancelamento("1".repeat(44), "Cancelado por motivos administrativos.").url).toBe("https://api.webmania.com.br/2/mdfe/cancelar");
  });

  it("atualiza o status pelo webhook de encerramento", async () => {
    const cliente = await prisma.cliente.create({ data: { nome: "Webhook MDF-e" } });
    const processo = await prisma.processo.create({
      data: { codigo: "MB-MDFE-2", titulo: "Webhook", canal: "EMAIL", clienteId: cliente.id },
    });
    const mdfe = await prisma.mdfe.create({
      data: { processoId: processo.id, chave: "3".repeat(44), status: "AUTORIZADO" },
    });
    process.env.WEBMANIA_WEBHOOK_TOKEN = "segredo-mdfe";
    const resposta = await webhook(
      new Request("http://localhost/api/webmania/mdfe?token=segredo-mdfe", {
        method: "POST",
        body: JSON.stringify({
          chave: "3".repeat(44),
          mdfe: 15,
          status: "encerrado",
          motivo: "MDF-e encerrada",
          damdfe: "https://api.webmania.com.br/damdfe/3",
        }),
      }),
    );
    expect(resposta.status).toBe(200);
    const atual = await prisma.mdfe.findUnique({ where: { id: mdfe.id } });
    expect(atual?.status).toBe("ENCERRADO");
    expect(atual?.numero).toBe("15");
    expect(atual?.damdfeUrl).toContain("/damdfe/");
  });
});
