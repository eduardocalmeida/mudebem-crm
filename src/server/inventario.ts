import { CATALOGO_MUDANCA, COMODOS } from "@/server/catalogo-mudanca";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export { COMODOS };

export async function garantirCatalogo() {
  const existentes = await prisma.itemCatalogo.findMany({ orderBy: { ordem: "asc" } });
  const vistos = new Set<string>();
  for (const item of existentes) {
    if (!vistos.has(item.nome)) {
      vistos.add(item.nome);
      continue;
    }
    const usado = await prisma.itemInventario.count({ where: { catalogoId: item.id } });
    if (usado === 0) await prisma.itemCatalogo.deleteMany({ where: { id: item.id } });
  }
  for (const [indice, item] of CATALOGO_MUDANCA.entries()) {
    if (vistos.has(item.nome)) continue;
    await prisma.itemCatalogo.create({
      data: { nome: item.nome, categoria: item.categoria, volumeM3: item.volume, ordem: indice },
    });
    vistos.add(item.nome);
  }
}

export async function listarCatalogo() {
  await garantirCatalogo();
  return prisma.itemCatalogo.findMany({ where: { ativo: true }, orderBy: [{ categoria: "asc" }, { ordem: "asc" }] });
}

function totalDe(itens: { quantidade: number; volumeUnitario: { toNumber(): number } }[]) {
  const quantidade = itens.reduce((soma, item) => soma + item.quantidade, 0);
  const volume = itens.reduce((soma, item) => soma + item.quantidade * item.volumeUnitario.toNumber(), 0);
  return { quantidade, volume: Math.round(volume * 1000) / 1000 };
}

async function atualizarVolumeDoProcesso(processoId: string) {
  const itens = await prisma.itemInventario.findMany({ where: { processoId } });
  const totais = totalDe(itens);
  const texto = `${totais.volume.toFixed(2).replace(".", ",")} m³`;
  await prisma.processo.update({ where: { id: processoId }, data: { volume: texto } });
  return totais;
}

export async function obterInventario(processoId: string) {
  await garantirCatalogo();
  const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { id: true } });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const itens = await prisma.itemInventario.findMany({
    where: { processoId },
    include: { catalogo: { select: { id: true, nome: true, categoria: true } } },
    orderBy: [{ comodo: "asc" }, { nome: "asc" }],
  });
  const totais = totalDe(itens);
  return {
    processoId,
    totais,
    volume: `${totais.volume.toFixed(2).replace(".", ",")} m³`,
    itens: itens.map((item) => ({
      id: item.id,
      nome: item.nome,
      comodo: item.comodo,
      quantidade: item.quantidade,
      volumeUnitario: item.volumeUnitario.toNumber(),
      volumeTotal: Math.round(item.quantidade * item.volumeUnitario.toNumber() * 1000) / 1000,
      fragil: item.fragil,
      desmontagem: item.desmontagem,
      embalagem: item.embalagem,
      personalizado: item.personalizado,
      catalogoId: item.catalogoId,
    })),
  };
}

export type EntradaItem = {
  catalogoId?: string | null;
  nome?: string | null;
  volumeM3?: number | null;
  comodo: string;
  quantidade?: number;
  fragil?: boolean;
  desmontagem?: boolean;
  embalagem?: boolean;
};

export async function adicionarItens(processoId: string, itens: EntradaItem[]) {
  const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { id: true } });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  if (!COMODOS.some((comodo) => comodo.id === itens[0]?.comodo) && itens.some((item) => !COMODOS.some((comodo) => comodo.id === item.comodo))) {
    throw new AppError("Cômodo inválido. Use SALA, QUARTO, COZINHA, BANHEIRO, AREA_SERVICO, ESCRITORIO, VARANDA ou OUTROS.", 400, "DADOS_INVALIDOS");
  }
  for (const item of itens) {
    if (!COMODOS.some((comodo) => comodo.id === item.comodo)) {
      throw new AppError(`Cômodo inválido: ${item.comodo}.`, 400, "DADOS_INVALIDOS");
    }
    const quantidade = item.quantidade && item.quantidade > 0 ? Math.round(item.quantidade) : 1;
    if (item.catalogoId) {
      const catalogo = await prisma.itemCatalogo.findUnique({ where: { id: item.catalogoId } });
      if (!catalogo) throw new AppError("Item do catálogo não encontrado.", 404, "NAO_ENCONTRADO");
      await prisma.itemInventario.create({
        data: {
          processoId,
          catalogoId: catalogo.id,
          nome: catalogo.nome,
          comodo: item.comodo,
          quantidade,
          volumeUnitario: catalogo.volumeM3,
          fragil: Boolean(item.fragil),
          desmontagem: Boolean(item.desmontagem),
          embalagem: Boolean(item.embalagem),
        },
      });
    } else {
      const nome = item.nome?.trim();
      const volume = item.volumeM3;
      if (!nome || volume == null || volume < 0) {
        throw new AppError("Item personalizado precisa de nome e volume em m³.", 400, "DADOS_INVALIDOS");
      }
      await prisma.itemInventario.create({
        data: {
          processoId,
          nome,
          comodo: item.comodo,
          quantidade,
          volumeUnitario: volume,
          fragil: Boolean(item.fragil),
          desmontagem: Boolean(item.desmontagem),
          embalagem: Boolean(item.embalagem),
          personalizado: true,
        },
      });
    }
  }
  const totais = await atualizarVolumeDoProcesso(processoId);
  return { ...totais, inventario: await obterInventario(processoId) };
}

const COMODO_CATEGORIA: Record<string, string> = {
  Sala: "SALA",
  Quarto: "QUARTO",
  Cozinha: "COZINHA",
  "Área de serviço": "AREA_SERVICO",
  Escritório: "ESCRITORIO",
  Varanda: "VARANDA",
};

function comodoDaCategoria(categoria: string) {
  return COMODO_CATEGORIA[categoria] ?? "OUTROS";
}

export async function ajustarQuantidade(processoId: string, alvo: { catalogoId?: string | null; itemId?: string | null }, delta: number) {
  if (delta !== 1 && delta !== -1) throw new AppError("A quantidade muda de um em um.", 400, "DADOS_INVALIDOS");
  const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { id: true } });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  if (alvo.catalogoId) {
    const catalogo = await prisma.itemCatalogo.findUnique({ where: { id: alvo.catalogoId } });
    if (!catalogo || !catalogo.ativo) throw new AppError("Item do catálogo não encontrado.", 404, "NAO_ENCONTRADO");
    const itens = await prisma.itemInventario.findMany({ where: { processoId, catalogoId: catalogo.id }, orderBy: { criadoEm: "asc" } });
    const soma = itens.reduce((total, item) => total + item.quantidade, 0);
    if (delta < 0) {
      const ultimo = [...itens].reverse().find((item) => item.quantidade > 0);
      if (!ultimo || soma <= 0) return atualizarVolumeDoProcesso(processoId);
      if (ultimo.quantidade <= 1) await prisma.itemInventario.delete({ where: { id: ultimo.id } });
      else await prisma.itemInventario.update({ where: { id: ultimo.id }, data: { quantidade: ultimo.quantidade - 1 } });
    } else if (itens[0]) {
      await prisma.itemInventario.update({ where: { id: itens[0].id }, data: { quantidade: itens[0].quantidade + 1 } });
    } else {
      await prisma.itemInventario.create({
        data: {
          processoId,
          catalogoId: catalogo.id,
          nome: catalogo.nome,
          comodo: comodoDaCategoria(catalogo.categoria),
          quantidade: 1,
          volumeUnitario: catalogo.volumeM3,
        },
      });
    }
  } else if (alvo.itemId) {
    const item = await prisma.itemInventario.findUnique({ where: { id: alvo.itemId } });
    if (!item || item.processoId !== processoId) throw new AppError("Item não encontrado.", 404, "NAO_ENCONTRADO");
    if (delta < 0) {
      if (item.quantidade <= 1) await prisma.itemInventario.delete({ where: { id: item.id } });
      else await prisma.itemInventario.update({ where: { id: item.id }, data: { quantidade: item.quantidade - 1 } });
    } else {
      await prisma.itemInventario.update({ where: { id: item.id }, data: { quantidade: item.quantidade + 1 } });
    }
  } else {
    throw new AppError("Informe o item.", 400, "DADOS_INVALIDOS");
  }
  return atualizarVolumeDoProcesso(processoId);
}

export async function definirValorDeclarado(processoId: string, chave: string, valor: number | null) {
  if (!/^(catalogo|item):[A-Za-z0-9_-]+$/.test(chave)) throw new AppError("Item inválido.", 400, "DADOS_INVALIDOS");
  if (valor != null && (!Number.isFinite(valor) || valor < 0 || valor > 9_999_999_999.99)) {
    throw new AppError("Informe um valor declarado em reais.", 400, "DADOS_INVALIDOS");
  }
  const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { extras: true } });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const extras = processo.extras && typeof processo.extras === "object" && !Array.isArray(processo.extras) ? { ...processo.extras } : {};
  const atuais = extras.inventarioValores && typeof extras.inventarioValores === "object" && !Array.isArray(extras.inventarioValores) ? { ...extras.inventarioValores } : {};
  if (valor == null) delete atuais[chave];
  else atuais[chave] = Math.round(valor * 100) / 100;
  extras.inventarioValores = atuais;
  await prisma.processo.update({ where: { id: processoId }, data: { extras } });
}

export async function removerItem(processoId: string, itemId: string) {
  const item = await prisma.itemInventario.findUnique({ where: { id: itemId } });
  if (!item || item.processoId !== processoId) throw new AppError("Item não encontrado.", 404, "NAO_ENCONTRADO");
  await prisma.itemInventario.delete({ where: { id: itemId } });
  await atualizarVolumeDoProcesso(processoId);
}
