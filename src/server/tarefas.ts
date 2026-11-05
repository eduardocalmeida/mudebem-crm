import { REGRAS_TAREFA, TIPOS_TAREFA } from "@/server/catalogo-mudanca";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export async function garantirTarefasPadrao() {
  for (const [slug, rotulo] of TIPOS_TAREFA) {
    await prisma.tipoTarefa.upsert({ where: { slug }, update: {}, create: { id: slug, slug, rotulo } });
  }
  for (const [etapaSlug, tipo, titulo, horas] of REGRAS_TAREFA) {
    await prisma.regraTarefa.upsert({
      where: { etapaSlug_tipoId: { etapaSlug, tipoId: tipo } },
      update: {},
      create: { etapaSlug, tipoId: tipo, titulo, horasDepois: horas },
    });
  }
}

export async function criarTarefasDaEtapa(processoId: string, etapa: string, responsavelId: string | null) {
  await garantirTarefasPadrao();
  const regras = await prisma.regraTarefa.findMany({ where: { etapaSlug: etapa, ativa: true }, include: { tipo: true } });
  const criadas = [];
  for (const regra of regras) {
    const aberta = await prisma.tarefa.findFirst({
      where: { processoId, tipoId: regra.tipoId, concluidaEm: null },
    });
    if (aberta) continue;
    criadas.push(
      await prisma.tarefa.create({
        data: {
          processoId,
          tipoId: regra.tipoId,
          titulo: regra.titulo,
          responsavelId,
          vencimento: new Date(Date.now() + regra.horasDepois * 3_600_000),
          automatica: true,
        },
      }),
    );
  }
  return criadas;
}

export async function listarTarefas(filtro: { responsavelId?: string; processoId?: string; de?: Date; ate?: Date; somenteAbertas?: boolean }) {
  await garantirTarefasPadrao();
  return prisma.tarefa.findMany({
    where: {
      ...(filtro.responsavelId ? { responsavelId: filtro.responsavelId } : {}),
      ...(filtro.processoId ? { processoId: filtro.processoId } : {}),
      ...(filtro.somenteAbertas ? { concluidaEm: null } : {}),
      ...(filtro.de || filtro.ate
        ? { vencimento: { gte: filtro.de, lte: filtro.ate } }
        : {}),
    },
    include: {
      tipo: true,
      responsavel: { select: { id: true, nome: true } },
      processo: { select: { id: true, codigo: true, titulo: true } },
    },
    orderBy: { vencimento: "asc" },
    take: 400,
  });
}

export function tarefaAtrasada(vencimento: Date, concluidaEm: Date | null, agora = new Date()) {
  return !concluidaEm && vencimento.getTime() < agora.getTime();
}

export async function criarTarefa(dados: {
  processoId: string;
  tipoId: string;
  titulo: string;
  responsavelId?: string | null;
  vencimento: Date;
  descricao?: string | null;
}) {
  const processo = await prisma.processo.findUnique({ where: { id: dados.processoId }, select: { id: true } });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const tipo = await prisma.tipoTarefa.findUnique({ where: { id: dados.tipoId } });
  if (!tipo) throw new AppError("Tipo de tarefa inválido.", 400, "DADOS_INVALIDOS");
  return prisma.tarefa.create({
    data: {
      processoId: dados.processoId,
      tipoId: dados.tipoId,
      titulo: dados.titulo,
      descricao: dados.descricao,
      responsavelId: dados.responsavelId,
      vencimento: dados.vencimento,
    },
  });
}
