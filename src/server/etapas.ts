import { ETAPAS_PADRAO, type EtapaConfig, type GrupoEtapa } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export type EtapaSalva = EtapaConfig & { ativa: boolean };

export async function garantirEtapas() {
  const existentes = await prisma.etapaPipeline.count();
  if (existentes >= ETAPAS_PADRAO.length) return;
  for (const etapa of ETAPAS_PADRAO) {
    await prisma.etapaPipeline.upsert({
      where: { slug: etapa.slug },
      update: {},
      create: {
        id: etapa.slug,
        slug: etapa.slug,
        rotulo: etapa.rotulo,
        resumo: etapa.resumo,
        cor: etapa.cor,
        ordem: etapa.ordem,
        grupo: etapa.grupo,
        terminal: etapa.terminal,
      },
    });
  }
}

export async function carregarEtapas(): Promise<EtapaSalva[]> {
  await garantirEtapas();
  const linhas = await prisma.etapaPipeline.findMany({ orderBy: { ordem: "asc" } });
  return linhas.map((etapa) => ({
    slug: etapa.slug,
    rotulo: etapa.rotulo,
    resumo: etapa.resumo,
    cor: etapa.cor,
    ordem: etapa.ordem,
    grupo: etapa.grupo as GrupoEtapa,
    terminal: etapa.terminal,
    ativa: etapa.ativa,
  }));
}

export function slugDaEtapa(rotulo: string) {
  const base = rotulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return base || "ETAPA";
}
