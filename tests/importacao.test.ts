import { describe, expect, it } from "vitest";
import { analisarCsv, importarPlanilha, normalizarCabecalho } from "@/server/importacao";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/password";
import type { Ator } from "@/lib/ator";

const csv = `ID;Nome do lead;Empresa;Etapa;Responsável;Telefone;Cidade origem;Cidade destino;Valor do frete;utm_source;Observação interna
9001;Mudança da família Prado;Oficina Norte;Negociação;Bruno Lima;11988881010;São Paulo;Campinas;12500,50;google;trazer piano
`;

describe("importação Kommo", () => {
  it("lê CSV com ponto e vírgula e cabeçalho acentuado", () => {
    const tabela = analisarCsv(csv);
    expect(tabela).toHaveLength(2);
    expect(normalizarCabecalho("Cidade origem")).toBe("cidade origem");
    expect(tabela[1][0]).toBe("9001");
  });

  it("cria o lead uma vez e atualiza na segunda importação", async () => {
    const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
    if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Mensagem", "Conversa", "MensagemWhatsapp", "ConversaWhatsapp", "NumeroWhatsapp", "ConfigWhatsapp", "Anexo", "Evento", "Processo", "Contato", "Cliente", "ChaveApi", "Usuario", "CampoPersonalizado", "EtapaPipeline" RESTART IDENTITY CASCADE',
    );
    const senhaHash = await hashSenha("senha-de-teste");
    const usuario = await prisma.usuario.create({
      data: { nome: "Bruno Lima", email: "bruno.importacao@mudebem.test", senhaHash, papel: "ADMIN" },
    });
    const ator: Ator = { tipo: "usuario", id: usuario.id, nome: usuario.nome, papel: "ADMIN" };
    const primeira = await importarPlanilha("leads", csv, ator);
    expect(primeira.criados).toBe(1);
    const processo = await prisma.processo.findUniqueOrThrow({ where: { kommoId: "9001" } });
    expect(processo.etapa).toBe("NEGOCIACAO");
    expect(processo.origemCidade).toBe("São Paulo");
    expect(processo.valorFrete?.toNumber()).toBe(12500.5);
    expect(processo.utmSource).toBe("google");
    expect(processo.extras).toMatchObject({ "observacao interna": "trazer piano" });

    const segunda = await importarPlanilha("leads", csv.replace("Campinas", "Santos"), ator);
    expect(segunda.atualizados).toBe(1);
    expect(await prisma.processo.count()).toBe(1);
    const atualizado = await prisma.processo.findUniqueOrThrow({ where: { kommoId: "9001" } });
    expect(atualizado.destinoCidade).toBe("Santos");
  });
});
