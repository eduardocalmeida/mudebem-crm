import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { garantirPortalAtvos } from "@/server/portal/atvos";
import { FAIXAS_ATVOS, calcularPrecoContrato } from "@/server/portal/preco";

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "SolicitacaoPortal", "FaixaPreco", "UsuarioPortal", "UnidadeEmpresa", "ContratoEmpresa", "EmpresaCliente", "Notificacao", "EmailFila", "Processo", "Cliente" RESTART IDENTITY CASCADE',
  );
}

beforeEach(limpar);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("portal de contrato", () => {
  it("não arredonda entre faixas e cobra o exemplo da Atvos", () => {
    expect(FAIXAS_ATVOS).toHaveLength(24);
    const cotacao = calcularPrecoContrato(FAIXAS_ATVOS, 0.02, 1000, 30.15, 50000);
    expect(cotacao.semFaixa).toBe(false);
    if (!cotacao.semFaixa) {
      expect(cotacao.frete.toFixed(2)).toBe("21500.00");
      expect(cotacao.seguro.toFixed(2)).toBe("1000.00");
      expect(cotacao.total.toFixed(2)).toBe("22500.00");
    }
    expect(calcularPrecoContrato(FAIXAS_ATVOS, 0.02, 100.5, 20.5, 1000).semFaixa).toBe(true);
    expect(calcularPrecoContrato(FAIXAS_ATVOS, 0.02, 100, 20, 0).semFaixa).toBe(false);
    const grande = calcularPrecoContrato(FAIXAS_ATVOS, 0.02, 990, 48, 100000);
    if (!grande.semFaixa) expect(grande.total.toFixed(2)).toBe("28730.00");
  });

  it("semeia a Atvos, as unidades e os três pedidos em A executar", async () => {
    await garantirPortalAtvos();
    const empresa = await prisma.empresaCliente.findUnique({
      where: { slug: "atvos" },
      include: { unidades: true, contratos: { include: { faixas: true } }, solicitacoes: true },
    });
    expect(empresa?.unidades).toHaveLength(9);
    expect(empresa?.contratos[0]?.faixas).toHaveLength(24);
    expect(empresa?.solicitacoes.map((item) => item.protocolo).sort()).toEqual([
      "MB-2026-000001",
      "MB-2026-000002",
      "MB-2026-000003",
    ]);
    const processo = await prisma.processo.findUnique({ where: { codigo: "MB-2026-000001" } });
    expect(await prisma.usuarioPortal.count({ where: { email: { in: ["colaborador@atvos.com.br", "gestor@atvos.com.br"] } } })).toBe(0);
    expect(processo?.etapa).toBe("A_EXECUTAR");
    expect(processo?.etiqueta).toBe("Contrato Atvos");
    expect(Number(processo?.valorAprovado)).toBe(22500);
  });
});
