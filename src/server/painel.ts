import { ETAPAS, type Etapa } from "@/lib/domain";
import { adicionarDias, hojeSaoPaulo, paraDataBanco } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function valorDe(valorAprovado: { toNumber(): number } | null, valorCotado: { toNumber(): number } | null) {
  if (valorAprovado != null) return valorAprovado.toNumber();
  if (valorCotado != null) return valorCotado.toNumber();
  return 0;
}

export async function carregarPainel() {
  const hoje = hojeSaoPaulo();
  const limite = adicionarDias(hoje, 7);
  const inicio = paraDataBanco(hoje)!;
  const fim = paraDataBanco(limite)!;
  const foraDaColeta: Etapa[] = ["PERDIDO_DECLINADO", "RECEBIDO", "FINALIZADO", "CONTAS_A_RECEBER"];

  const [processos, coletas, vencidos] = await Promise.all([
    prisma.processo.findMany({
      select: { etapa: true, valorCotado: true, valorAprovado: true, exemplo: true },
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
  ]);

  const porEtapa = ETAPAS.map((etapa) => {
    const itens = processos.filter((processo) => processo.etapa === etapa.id);
    return {
      ...etapa,
      quantidade: itens.length,
      valor: itens.reduce((total, processo) => total + valorDe(processo.valorAprovado, processo.valorCotado), 0),
    };
  });

  const abertos = processos.filter((processo) => processo.etapa !== "RECEBIDO" && processo.etapa !== "PERDIDO_DECLINADO");

  return {
    hoje,
    total: processos.length,
    abertos: abertos.length,
    valorPipeline: abertos.reduce((total, processo) => total + valorDe(processo.valorAprovado, processo.valorCotado), 0),
    porEtapa,
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
      dataVencimento: processo.dataVencimento!.toISOString().slice(0, 10),
      valor: valorDe(processo.valorAprovado, processo.valorCotado),
    })),
  };
}
