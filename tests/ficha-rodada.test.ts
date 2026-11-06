import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { agruparPorDia } from "@/lib/fio";
import { interpretarVencimento, vencimentoParaCampo } from "@/lib/format";
import { montarLinhasInventario, ordenarPtBr } from "@/lib/inventario-lista";
import { hashSenha } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { lerPatchProcesso } from "@/server/formulario";
import { ajustarQuantidade, definirValorDeclarado, listarCatalogo, obterInventario } from "@/server/inventario";
import { atualizarProcesso, criarProcesso } from "@/server/processos";
import { atualizarVencimentoTarefa, criarTarefa } from "@/server/tarefas";

const ficha = readFileSync(new URL("../src/components/ficha-conversa.tsx", import.meta.url), "utf8");
const fio = readFileSync(new URL("../src/components/fio-mensagens.tsx", import.meta.url), "utf8");
const pagamento = readFileSync(new URL("../src/lib/pagamento.ts", import.meta.url), "utf8");
const pagina = readFileSync(new URL("../src/app/(app)/processos/[id]/page.tsx", import.meta.url), "utf8");
const formulario = readFileSync(new URL("../src/components/formularios.tsx", import.meta.url), "utf8");
const seletor = readFileSync(new URL("../src/components/seletor-etapa.tsx", import.meta.url), "utf8");
const vencimento = readFileSync(new URL("../src/components/campo-vencimento.tsx", import.meta.url), "utf8");

async function limpar() {
  const linhas = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
  if (linhas[0]?.current_database !== "mudebem_test") throw new Error("Banco de teste incorreto.");
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Mensagem", "Conversa", "ItemInventario", "Tarefa", "Anexo", "Evento", "Processo", "Contato", "Cliente", "Usuario" RESTART IDENTITY CASCADE',
  );
}

beforeEach(limpar);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("conversa e vencimento", () => {
  it("agrupa o dia em São Paulo e separa os balões sem seletor de direção", () => {
    const grupos = agruparPorDia([
      { id: "a", criadaEm: new Date("2026-11-06T02:30:00.000Z") },
      { id: "b", criadaEm: new Date("2026-11-06T15:00:00.000Z") },
    ]);
    expect(grupos.map((grupo) => grupo.dia)).toEqual(["2026-11-05", "2026-11-06"]);
    expect(fio).toContain("bolha saida");
    expect(fio).toContain("bolha entrada");
    expect(fio).toContain("divisor-dia");
    expect(ficha).toContain("Registro no histórico");
    expect(ficha).not.toContain('name="direcao"');
    expect(ficha).not.toContain(">Saída<");
    expect(ficha).not.toContain(">Entrada<");
  });

  it("mantém hora e dia de São Paulo ao reabrir o vencimento", async () => {
    const original = interpretarVencimento("2026-12-02T09:30");
    expect(original?.toISOString()).toBe("2026-12-02T12:30:00.000Z");
    expect(vencimentoParaCampo(original!)).toBe("2026-12-02T09:30");
    expect(vencimento).toContain("showPicker");
    expect(vencimento).toContain("catch");

    const ana = await prisma.usuario.create({
      data: { nome: "Ana", email: "ana-tarefa@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "ADMIN" },
    });
    const cliente = await prisma.cliente.create({ data: { nome: "Tarefas" } });
    const processo = await prisma.processo.create({
      data: { codigo: "MB-TF-1", titulo: "MB-TF-1", canal: "EMAIL", clienteId: cliente.id },
    });
    const tipo = await prisma.tipoTarefa.upsert({
      where: { slug: "ACOMPANHAR" },
      update: {},
      create: { id: "ACOMPANHAR", slug: "ACOMPANHAR", rotulo: "Acompanhar" },
    });
    const tarefa = await criarTarefa({
      processoId: processo.id,
      tipoId: tipo.id,
      titulo: "Ligar",
      responsavelId: ana.id,
      vencimento: original!,
    });
    await atualizarVencimentoTarefa(tarefa.id, interpretarVencimento("2026-12-03T18:15")!);
    const salva = await prisma.tarefa.findUnique({ where: { id: tarefa.id } });
    expect(vencimentoParaCampo(salva!.vencimento)).toBe("2026-12-03T18:15");
    expect(salva!.titulo).toBe("Ligar");
  });
});

describe("ficha da oportunidade", () => {
  it("tira o resumo de rota e o bloco grande de etapa, e deixa o seletor fora do formulário", () => {
    expect(pagina).not.toContain("rota-grande");
    expect(pagina).not.toContain("Mover etapa");
    expect(pagina).toContain("SeletorEtapa");
    expect(pagina).not.toContain("valor-principal");
    expect(pagina).not.toContain("formatarBRL");
    expect(pagina).not.toContain('["tarefas", "Tarefas"]');
    expect(formulario).toContain("EnderecoFicha");
    expect(seletor).not.toContain("observacao");
    expect(seletor).toContain("moverEtapaAction");
    expect(formulario).not.toContain('nome="valorAprovado"');
    expect(formulario).not.toContain('nome="valorCotado"');
    expect(formulario).not.toContain('nome="fonte"');
    expect(formulario).toContain('nome="valorTotal"');
    expect(formulario).toContain("FORMAS_PAGAMENTO_FICHA");
    expect(pagamento).toContain("TED/Pix à vista");
  });

  it("preserva valores ocultos, fonte e pagamento legado, e grava a forma escolhida", async () => {
    const ana = await prisma.usuario.create({
      data: { nome: "Ana", email: "ana-ficha@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "ADMIN" },
    });
    const ator = { tipo: "usuario" as const, id: ana.id, nome: ana.nome, papel: "ADMIN" as const };
    const cliente = await prisma.cliente.create({ data: { nome: "Cliente Ficha" } });
    const processo = await prisma.processo.create({
      data: {
        codigo: "MB-FC-1",
        titulo: "MB-FC-1",
        canal: "EMAIL",
        clienteId: cliente.id,
        valorCotado: 1000,
        valorAprovado: 900,
        valorFrete: 100,
        valorSeguro: 20,
        valorTotal: 920,
        fonte: "google",
        formaPagamento: "50% na assinatura do contrato e 50% no ato",
        colaborador: "Maria",
        responsavelId: ana.id,
      },
    });
    const form = new FormData();
    form.set("valorFrete", "150");
    form.set("valorSeguro", "20");
    form.set("valorTotal", "920");
    form.set("volume", "12 m³");
    await atualizarProcesso(ator, processo.id, lerPatchProcesso(form, "ADMIN"));
    const salvo = await prisma.processo.findUnique({ where: { id: processo.id } });
    expect(salvo?.valorCotado?.toNumber()).toBe(1000);
    expect(salvo?.valorAprovado?.toNumber()).toBe(900);
    expect(salvo?.fonte).toBe("google");
    expect(salvo?.formaPagamento).toBe("50% na assinatura do contrato e 50% no ato");
    expect(salvo?.valorFrete?.toNumber()).toBe(150);
    expect(salvo?.colaborador).toBe("Maria");
    expect(salvo?.responsavelId).toBe(ana.id);

    const troca = new FormData();
    troca.set("formaPagamento", "TED/Pix à vista");
    await atualizarProcesso(ator, processo.id, lerPatchProcesso(troca, "ADMIN"));
    const novo = await prisma.processo.findUnique({ where: { id: processo.id } });
    expect(novo?.formaPagamento).toBe("TED/Pix à vista");
    expect(novo?.valorCotado?.toNumber()).toBe(1000);

    const invalida = new FormData();
    invalida.set("formaPagamento", "Cartão 12 vezes");
    expect(() => lerPatchProcesso(invalida, "ADMIN")).toThrow(/lista/);
  });

  it("mantém o contato principal e acrescenta outro papel sem mudar o cliente", async () => {
    const ana = await prisma.usuario.create({
      data: { nome: "Ana", email: "ana-vinc@mudebem.test", senhaHash: await hashSenha("senha-de-teste"), papel: "ADMIN" },
    });
    const ator = { tipo: "usuario" as const, id: ana.id, nome: ana.nome, papel: "ADMIN" as const };
    const cliente = await prisma.cliente.create({ data: { nome: "Empresa" } });
    const outro = await prisma.cliente.create({ data: { nome: "Outra" } });
    const comprador = await prisma.contato.create({ data: { clienteId: cliente.id, nome: "Comprador", email: "c@empresa.test" } });
    const alheio = await prisma.contato.create({ data: { clienteId: outro.id, nome: "Alheio" } });
    const processo = await criarProcesso(ator, {
      canal: "EMAIL",
      clienteId: cliente.id,
      contatoId: comprador.id,
      colaborador: "Texto livre",
    });
    await atualizarProcesso(ator, processo.id, {
      contatosVinculo: [{ contatoId: comprador.id, papel: "comprador" }, { novo: { nome: "Colaborador Novo", telefone: "62988881010" }, papel: "colaborador" }],
      contatoPrincipalId: comprador.id,
    });
    const salvo = await prisma.processo.findUnique({ where: { id: processo.id }, include: { contato: true } });
    expect(salvo?.contatoId).toBe(comprador.id);
    expect(salvo?.clienteId).toBe(cliente.id);
    expect(salvo?.colaborador).toBe("Texto livre");
    expect(salvo?.responsavelId).toBe(ana.id);
    expect(JSON.stringify(salvo?.extras)).toContain("colaborador");
    const criado = await prisma.contato.findFirst({ where: { nome: "Colaborador Novo" } });
    expect(criado?.clienteId).toBe(cliente.id);
    await expect(
      atualizarProcesso(ator, processo.id, { contatosVinculo: [{ contatoId: alheio.id, papel: "comprador" }], contatoPrincipalId: comprador.id }),
    ).rejects.toThrow(/neste cliente/);
    const ainda = await prisma.processo.findUnique({ where: { id: processo.id } });
    expect(ainda?.contatoId).toBe(comprador.id);
  });
});

describe("inventário pré-listado", () => {
  it("ordena em português e não trata zero como registro", () => {
    const nomes = ordenarPtBr([{ nome: "Último" }, { nome: "Banana" }, { nome: "Água" }]).map((item) => item.nome);
    expect(nomes).toEqual(["Água", "Banana", "Último"]);
    const linhas = montarLinhasInventario(
      [
        { id: "b", nome: "Sofá", volumeM3: 2.2 },
        { id: "a", nome: "Cadeira", volumeM3: 0.15 },
      ],
      [],
      {},
    );
    expect(linhas.map((linha) => linha.nome)).toEqual(["Cadeira", "Sofá"]);
    expect(linhas.every((linha) => linha.quantidade === 0)).toBe(true);
  });

  it("usa o volume do catálogo, zera sem apagar legado e guarda o valor declarado", async () => {
    const catalogo = await listarCatalogo();
    const sofa = catalogo.find((item) => item.nome === "Sofá 3 lugares");
    expect(sofa?.volumeM3.toNumber()).toBe(2.2);
    const cliente = await prisma.cliente.create({ data: { nome: "Volume" } });
    const processo = await prisma.processo.create({
      data: { codigo: "MB-INV-1", titulo: "MB-INV-1", canal: "EMAIL", clienteId: cliente.id },
    });
    const antes = await prisma.itemInventario.count({ where: { processoId: processo.id } });
    await obterInventario(processo.id);
    expect(await prisma.itemInventario.count({ where: { processoId: processo.id } })).toBe(antes);
    await ajustarQuantidade(processo.id, { catalogoId: sofa!.id }, 1);
    await ajustarQuantidade(processo.id, { catalogoId: sofa!.id }, 1);
    await prisma.itemInventario.create({
      data: { processoId: processo.id, nome: "Piano de cauda", comodo: "SALA", quantidade: 1, volumeUnitario: 2.5, personalizado: true },
    });
    await ajustarQuantidade(processo.id, { catalogoId: sofa!.id }, -1);
    await ajustarQuantidade(processo.id, { catalogoId: sofa!.id }, -1);
    await definirValorDeclarado(processo.id, `catalogo:${sofa!.id}`, 1500);
    const itens = await prisma.itemInventario.findMany({ where: { processoId: processo.id } });
    expect(itens.map((item) => item.nome)).toEqual(["Piano de cauda"]);
    const extras = await prisma.processo.findUnique({ where: { id: processo.id } });
    expect(JSON.stringify(extras?.extras)).toContain("1500");
    const inventario = await obterInventario(processo.id);
    expect(inventario.volume).toBe("2,50 m³");
  });
});
