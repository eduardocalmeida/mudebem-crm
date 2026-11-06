import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as webhook } from "@/app/api/webmania/nfse/route";
import { prisma } from "@/lib/prisma";
import { definirDocumentoFiscal, emitirNfse, obterOuPreencherNfse, preencherNfse } from "@/server/nfse/nfse";
import { sugerirDocumentoFiscal } from "@/server/nfse/regra";
import { montarPayloadNfse, ProvedorWebmaniaNfse } from "@/server/nfse/webmania";

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Nfse", "CodigoServicoNfse", "Processo", "Contato", "Cliente" RESTART IDENTITY CASCADE',
  );
}

beforeEach(limpar);
afterEach(() => {
  delete process.env.WEBMANIA_ACCESS_TOKEN;
  delete process.env.WEBMANIA_WEBHOOK_TOKEN;
  delete process.env.WEBMANIA_NFSE_MODELO;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("NFS-e", () => {
  it("sugere NFS-e na mesma cidade e CT-e quando o município muda", () => {
    expect(sugerirDocumentoFiscal("São Paulo", "Sao Paulo")).toBe("NFSE");
    expect(sugerirDocumentoFiscal("Curitiba", "São Paulo")).toBe("CTE");
    expect(sugerirDocumentoFiscal("Curitiba", "")).toBeNull();
  });

  it("preenche a nota com o cliente e monta o JSON sem enviar", async () => {
    const cliente = await prisma.cliente.create({
      data: { nome: "Casa Azul Ltda", cnpj: "11222333000181", email: "financeiro@casa.example", endereco: "Rua das Flores, 120" },
    });
    const processo = await prisma.processo.create({
      data: {
        codigo: "MB-NFSE-1",
        titulo: "Mudança local",
        canal: "SITE",
        clienteId: cliente.id,
        origemCidade: "Curitiba",
        origemUf: "PR",
        destinoCidade: "Curitiba",
        destinoUf: "PR",
        origemEndereco: "Rua das Flores, 120",
        valorAprovado: 1800,
        volume: "8,00 m³",
      },
    });
    expect(sugerirDocumentoFiscal(processo.origemCidade, processo.destinoCidade)).toBe("NFSE");
    const nota = await obterOuPreencherNfse(processo.id);
    expect(nota.tomadorNome).toBe("Casa Azul Ltda");
    expect(nota.tomadorDocumento).toBe("11222333000181");
    expect(nota.municipioPrestacao).toBe("Curitiba");
    expect(nota.prestadorMunicipio).toBe("Goiânia");
    expect(nota.prestadorUf).toBe("GO");
    expect(nota.prestadorIbge).toBe("5208707");
    expect(nota.codigoServico).toBe("16.02");
    expect(Number(nota.valorServicos)).toBe(1800);
    expect(nota.discriminacao).toContain("mesmo município".replace("mesmo município", "município de Curitiba") || "Curitiba");

    await prisma.nfse.update({ where: { id: nota.id }, data: { aliquotaIss: 5, aliquotaPis: 0.65, ibsSituacao: "000", ibsClassificacao: "000001" } });
    const atual = await prisma.nfse.findUniqueOrThrow({ where: { id: nota.id } });
    const { rascunhoDe } = await import("@/server/nfse/nfse");
    const montado = montarPayloadNfse(rascunhoDe(atual), 2);
    expect(montado.pendencias).toEqual([]);
    expect(montado.payload).toMatchObject({
      ambiente: 2,
      rps: [
        {
          servico: {
            valor_servicos: "1800.00",
            codigo_servico: "16.02",
            iss_retido: 2,
            impostos: { iss: "5.00", pis: "0.65", ibs_cbs: { situacao_tributaria: "000" } },
          },
          tomador: { cnpj: "11222333000181", razao_social: "Casa Azul Ltda", email: "financeiro@casa.example" },
        },
      ],
    });

    await expect(emitirNfse(nota.id)).rejects.toMatchObject({ codigo: "PROVEDOR_AUSENTE" });
    process.env.WEBMANIA_ACCESS_TOKEN = "token-de-teste";
    const gravada = await emitirNfse(nota.id);
    expect(gravada.mensagemProvedor).toContain("não envia");
    expect((gravada.pedidoPreparado as { url: string; enviado: boolean }).url).toBe("https://api.webmania.com.br/2/nfse/emissao");
    expect((gravada.pedidoPreparado as { enviado: boolean }).enviado).toBe(false);
    expect(new ProvedorWebmaniaNfse().prepararCancelamento("uuid-1", 1).url).toBe("https://api.webmania.com.br/2/nfse/cancelar");

    await definirDocumentoFiscal(processo.id, "CTE");
    const manual = await prisma.processo.findUniqueOrThrow({ where: { id: processo.id } });
    expect(manual.documentoFiscal).toBe("CTE");
    expect(manual.documentoFiscalManual).toBe(true);
    const preenchida = await preencherNfse(processo.id);
    expect(preenchida.codigoServico).toBe("16.02");
    const { salvarEmpresa, obterEmpresa } = await import("@/server/empresa");
    await salvarEmpresa({ nome: "Mude Bem", cnpj: null, ie: null, municipio: "Aparecida de Goiânia", uf: "GO", codigoIbge: "5201405" });
    const outra = await prisma.processo.create({
      data: {
        codigo: "MB-NFSE-3",
        titulo: "Outra sede",
        canal: "SITE",
        clienteId: cliente.id,
        origemCidade: "Curitiba",
        origemUf: "PR",
        destinoCidade: "Curitiba",
        destinoUf: "PR",
      },
    });
    expect((await preencherNfse(outra.id)).prestadorIbge).toBe("5201405");
    await salvarEmpresa({ nome: null, cnpj: null, ie: null, municipio: "Goiânia", uf: "GO", codigoIbge: "5208707" });
    expect((await obterEmpresa()).municipio).toBe("Goiânia");
  });

  it("grava número e código de verificação pelo webhook", async () => {
    const cliente = await prisma.cliente.create({ data: { nome: "Webhook NFS-e" } });
    const processo = await prisma.processo.create({
      data: { codigo: "MB-NFSE-2", titulo: "Webhook", canal: "EMAIL", clienteId: cliente.id },
    });
    const nota = await prisma.nfse.create({
      data: { processoId: processo.id, uuidProvedor: "43eace5c-8008-4f6c-b830-b6d52d7ff90c", status: "PROCESSANDO" },
    });
    process.env.WEBMANIA_WEBHOOK_TOKEN = "segredo-nfse";
    const resposta = await webhook(
      new Request("http://localhost/api/webmania/nfse?token=segredo-nfse", {
        method: "POST",
        body: JSON.stringify({
          uuid: nota.uuidProvedor,
          status: "aprovado",
          numero: 321,
          codigo_verificacao: "SFH-046",
          pdf_nfse: "https://api.webmania.com.br/nfse/pdf",
          xml: "https://api.webmania.com.br/xmlnfse/1",
        }),
      }),
    );
    expect(resposta.status).toBe(200);
    const atual = await prisma.nfse.findUniqueOrThrow({ where: { id: nota.id } });
    expect(atual.status).toBe("AUTORIZADO");
    expect(atual.numero).toBe("321");
    expect(atual.codigoVerificacao).toBe("SFH-046");
    expect(atual.pdfUrl).toContain("/nfse/pdf");
  });
});
