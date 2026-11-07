import { rotuloCanal, type Canal } from "@/lib/domain";
import { ehGanho, ehPerdido } from "@/lib/resultado-comercial";
import { adicionarDias, hojeSaoPaulo, paraDataBanco } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { carregarEtapas } from "@/server/etapas";

function valorDe(valorAprovado: { toNumber(): number } | null, valorCotado: { toNumber(): number } | null) {
  if (valorAprovado != null) return valorAprovado.toNumber();
  if (valorCotado != null) return valorCotado.toNumber();
  return 0;
}

function diaSp(data: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(data);
}

function inicioSemana(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() - ((data.getUTCDay() + 6) % 7));
  return data.toISOString().slice(0, 10);
}

export async function carregarPainel() {
  const hoje = hojeSaoPaulo();
  const limite = adicionarDias(hoje, 7);
  const inicio = paraDataBanco(hoje)!;
  const fim = paraDataBanco(limite)!;
  const inicioHoje = new Date(`${hoje}T00:00:00-03:00`);
  const fimHoje = new Date(`${adicionarDias(hoje, 1)}T00:00:00-03:00`);
  const fimAgenda = new Date(`${adicionarDias(hoje, 8)}T00:00:00-03:00`);
  const desdeNovos = new Date(`${adicionarDias(hoje, -7)}T00:00:00-03:00`);
  const estaSemana = inicioSemana(hoje);
  const semanas = Array.from({ length: 8 }, (_, indice) => adicionarDias(estaSemana, -7 * (7 - indice)));
  const foraDaColeta = ["PERDIDO", "GANHO", "RECEBIDO", "FATURADO_HAVER", "CONTAS_A_RECEBER", "POS_VENDA"];

  const [processos, coletas, vencidos, ganhosEvento, tarefasHoje, tarefasAtrasadas, agenda] = await Promise.all([
    prisma.processo.findMany({
      select: {
        etapa: true,
        valorCotado: true,
        valorAprovado: true,
        exemplo: true,
        canal: true,
        etiqueta: true,
        criadoEm: true,
        extras: true,
        responsavel: { select: { nome: true } },
      },
    }),
    prisma.processo.findMany({
      where: { dataColeta: { gte: inicio, lte: fim }, etapa: { notIn: foraDaColeta } },
      include: {
        cliente: { select: { nome: true } },
        responsavel: { select: { nome: true } },
      },
      orderBy: { dataColeta: "asc" },
    }),
    prisma.processo.findMany({
      where: { etapa: "CONTAS_A_RECEBER", dataVencimento: { lt: inicio } },
      include: { cliente: { select: { nome: true } } },
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.evento.findMany({
      where: {
        criadoEm: { gte: new Date(`${semanas[0]}T00:00:00-03:00`) },
        OR: [{ etapaPara: "GANHO" }, { etapaPara: "EM_EXECUCAO", mensagem: { contains: "Resultado comercial: ganho" } }],
      },
      select: { criadoEm: true },
    }),
    prisma.tarefa.count({ where: { concluidaEm: null, vencimento: { gte: inicioHoje, lt: fimHoje } } }),
    prisma.tarefa.count({ where: { concluidaEm: null, vencimento: { lt: inicioHoje } } }),
    prisma.tarefa.findMany({
      where: { concluidaEm: null, vencimento: { gte: inicioHoje, lt: fimAgenda } },
      orderBy: { vencimento: "asc" },
      take: 8,
      include: { processo: { select: { id: true, codigo: true } }, tipo: { select: { rotulo: true } } },
    }),
  ]);

  const etapas = await carregarEtapas();
  const porEtapa = etapas.filter((etapa) => etapa.ativa && etapa.slug !== "GANHO" && etapa.slug !== "PERDIDO").map((etapa) => {
    const itens = processos.filter((processo) => processo.etapa === etapa.slug);
    return {
      ...etapa,
      quantidade: itens.length,
      valor: itens.reduce((total, processo) => total + valorDe(processo.valorAprovado, processo.valorCotado), 0),
    };
  });

  const encerrados = new Set(["RECEBIDO", "PERDIDO", "GANHO", "POS_VENDA"]);
  const abertos = processos.filter((processo) => !encerrados.has(processo.etapa));
  const serie = semanas.map((inicioSemanaIso) => {
    const fimSemana = adicionarDias(inicioSemanaIso, 7);
    const noIntervalo = (data: Date) => {
      const dia = diaSp(data);
      return dia >= inicioSemanaIso && dia < fimSemana;
    };
    return {
      inicio: inicioSemanaIso,
      rotulo: `${inicioSemanaIso.slice(8, 10)}/${inicioSemanaIso.slice(5, 7)}`,
      leads: processos.filter((processo) => noIntervalo(processo.criadoEm)).length,
      ganhos: ganhosEvento.filter((evento) => noIntervalo(evento.criadoEm)).length,
    };
  });
  const canaisMap = new Map<string, number>();
  const pessoas = new Map<string, { quantidade: number; valor: number }>();
  const etiquetasMap = new Map<string, number>();
  for (const processo of processos) {
    canaisMap.set(processo.canal, (canaisMap.get(processo.canal) ?? 0) + 1);
    if (processo.responsavel?.nome) {
      const atual = pessoas.get(processo.responsavel.nome) ?? { quantidade: 0, valor: 0 };
      atual.quantidade += 1;
      atual.valor += valorDe(processo.valorAprovado, processo.valorCotado);
      pessoas.set(processo.responsavel.nome, atual);
    }
    const etiqueta = processo.etiqueta?.trim();
    if (etiqueta) etiquetasMap.set(etiqueta, (etiquetasMap.get(etiqueta) ?? 0) + 1);
  }

  return {
    hoje,
    total: processos.length,
    abertos: abertos.length,
    novos: processos.filter((processo) => processo.criadoEm >= desdeNovos).length,
    ganhos: processos.filter((processo) => ehGanho(processo.etapa, processo.extras)).length,
    perdidos: processos.filter((processo) => ehPerdido(processo.etapa, processo.extras)).length,
    tarefasHoje,
    tarefasAtrasadas,
    valorPipeline: abertos.reduce((total, processo) => total + valorDe(processo.valorAprovado, processo.valorCotado), 0),
    porEtapa,
    serie,
    canais: [...canaisMap.entries()]
      .map(([id, quantidade]) => ({ id, rotulo: rotuloCanal(id as Canal), quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
    responsaveis: [...pessoas.entries()]
      .map(([nome, item]) => ({ nome, ...item }))
      .sort((a, b) => b.quantidade - a.quantidade || b.valor - a.valor)
      .slice(0, 5),
    etiquetas: [...etiquetasMap.entries()]
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5),
    agenda: agenda.map((tarefa) => ({
      id: tarefa.id,
      titulo: tarefa.titulo,
      tipo: tarefa.tipo.rotulo,
      vencimento: tarefa.vencimento.toISOString(),
      processoId: tarefa.processo.id,
      codigo: tarefa.processo.codigo,
    })),
    exemplos: processos.some((processo) => processo.exemplo),
    coletas: coletas.map((processo) => ({
      id: processo.id,
      codigo: processo.codigo,
      titulo: processo.titulo,
      cliente: processo.cliente.nome,
      origem: processo.origemCidade,
      destino: processo.destinoCidade,
      dataColeta: processo.dataColeta!.toISOString().slice(0, 10),
      responsavel: processo.responsavel?.nome ?? null,
      etapa: processo.etapa,
    })),
    vencidos: vencidos.map((processo) => ({
      id: processo.id,
      codigo: processo.codigo,
      titulo: processo.titulo,
      cliente: processo.cliente.nome,
      numeroNf: processo.numeroNf,
      etapa: processo.etapa,
      dataVencimento: processo.dataVencimento!.toISOString().slice(0, 10),
      valor: valorDe(processo.valorAprovado, processo.valorCotado),
    })),
  };
}
