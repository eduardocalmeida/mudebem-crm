import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { RascunhoMdfe } from "@/server/cte/contrato";
import { obterProvedorMdfe } from "@/server/mdfe/provedor";

function numero(valor: Prisma.Decimal | number | null | undefined) {
  if (valor == null) return null;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : null;
}

export function rascunhoDe(mdfe: {
  ufInicio: string | null;
  ufFim: string | null;
  percurso: string | null;
  municipioCarregamento: string | null;
  municipioDescarregamento: string | null;
  placa: string | null;
  renavam: string | null;
  taraKg: number | null;
  capacidadeKg: number | null;
  capacidadeM3: number | null;
  condutorNome: string | null;
  condutorCpf: string | null;
  rntrc: string | null;
  seguradoraNome: string | null;
  seguradoraCnpj: string | null;
  apolice: string | null;
  averbacao: string | null;
  valorCarga: Prisma.Decimal | null;
  pesoBruto: Prisma.Decimal | null;
  documentos: { cte: { chave: string | null; municipioFim: string | null } }[];
}): RascunhoMdfe {
  const grupos = new Map<string, string[]>();
  for (const documento of mdfe.documentos) {
    const nome = documento.cte.municipioFim || mdfe.municipioDescarregamento || "Destino";
    const chaves = grupos.get(nome) ?? [];
    if (documento.cte.chave) chaves.push(documento.cte.chave);
    grupos.set(nome, chaves);
  }
  return {
    ufInicio: mdfe.ufInicio,
    ufFim: mdfe.ufFim,
    percurso: (mdfe.percurso ?? "")
      .split(",")
      .map((uf) => uf.trim().toUpperCase())
      .filter((uf) => uf.length === 2),
    carregamento: mdfe.municipioCarregamento ? [{ nome: mdfe.municipioCarregamento }] : [],
    descarregamento: [...grupos.entries()].map(([nome, chaves]) => ({ nome, chaves })),
    placa: mdfe.placa,
    renavam: mdfe.renavam,
    taraKg: mdfe.taraKg,
    capacidadeKg: mdfe.capacidadeKg,
    capacidadeM3: mdfe.capacidadeM3,
    condutorNome: mdfe.condutorNome,
    condutorCpf: mdfe.condutorCpf,
    rntrc: mdfe.rntrc,
    seguradoraNome: mdfe.seguradoraNome,
    seguradoraCnpj: mdfe.seguradoraCnpj,
    apolice: mdfe.apolice,
    averbacoes: (mdfe.averbacao ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    valorCarga: numero(mdfe.valorCarga),
    pesoBruto: numero(mdfe.pesoBruto),
  };
}

const inclusao = {
  documentos: {
    include: {
      cte: {
        select: {
          id: true,
          chave: true,
          numero: true,
          municipioFim: true,
          valorPrestacao: true,
          quantidadeCarga: true,
          processo: { select: { id: true, codigo: true } },
        },
      },
    },
  },
  processo: { select: { id: true, codigo: true, titulo: true } },
} as const;

export async function criarMdfeDoProcesso(processoId: string, cteIds?: string[]) {
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    include: { ctes: true },
  });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const escolhidos = cteIds?.length ? processo.ctes.filter((cte) => cteIds.includes(cte.id)) : processo.ctes;
  if (escolhidos.length === 0) throw new AppError("O processo ainda não tem CT-e para manifestar.", 400, "DADOS_INVALIDOS");
  const valor = escolhidos.reduce((soma, cte) => soma + (numero(cte.valorCarga) ?? numero(cte.valorPrestacao) ?? 0), 0);
  return prisma.mdfe.create({
    data: {
      processoId,
      status: "RASCUNHO",
      modalidade: 1,
      ufInicio: processo.origemUf,
      ufFim: processo.destinoUf,
      municipioCarregamento: processo.origemCidade,
      municipioDescarregamento: processo.destinoCidade,
      placa: processo.motoristaPlaca,
      condutorNome: processo.motoristaNome,
      condutorCpf: processo.motoristaCpf,
      rntrc: processo.motoristaAntt,
      valorCarga: valor || null,
      documentos: { create: escolhidos.map((cte) => ({ cteId: cte.id })) },
    },
    include: inclusao,
  });
}

export async function listarMdfes() {
  return prisma.mdfe.findMany({
    orderBy: { criadoEm: "desc" },
    include: { processo: { select: { codigo: true, titulo: true } }, _count: { select: { documentos: true } } },
    take: 100,
  });
}

export async function obterMdfe(id: string) {
  const mdfe = await prisma.mdfe.findUnique({ where: { id }, include: inclusao });
  if (!mdfe) throw new AppError("MDF-e não encontrado.", 404, "NAO_ENCONTRADO");
  return mdfe;
}

export async function salvarMdfe(
  id: string,
  dados: {
    ufInicio: string | null;
    ufFim: string | null;
    percurso: string | null;
    municipioCarregamento: string | null;
    municipioDescarregamento: string | null;
    placa: string | null;
    renavam: string | null;
    taraKg: number | null;
    capacidadeKg: number | null;
    capacidadeM3: number | null;
    condutorNome: string | null;
    condutorCpf: string | null;
    rntrc: string | null;
    seguradoraNome: string | null;
    seguradoraCnpj: string | null;
    apolice: string | null;
    averbacao: string | null;
    valorCarga: number | null;
    pesoBruto: number | null;
    cteIds: string[];
  },
) {
  const atual = await prisma.mdfe.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!atual) throw new AppError("MDF-e não encontrado.", 404, "NAO_ENCONTRADO");
  if (atual.status !== "RASCUNHO") throw new AppError("Só um rascunho pode ser editado.", 400, "DADOS_INVALIDOS");
  const ctes = await prisma.cte.findMany({ where: { id: { in: dados.cteIds } }, select: { id: true } });
  if (ctes.length === 0) throw new AppError("Selecione ao menos um CT-e.", 400, "DADOS_INVALIDOS");
  await prisma.mdfeCte.deleteMany({ where: { mdfeId: id } });
  return prisma.mdfe.update({
    where: { id },
    data: {
      ufInicio: dados.ufInicio,
      ufFim: dados.ufFim,
      percurso: dados.percurso,
      municipioCarregamento: dados.municipioCarregamento,
      municipioDescarregamento: dados.municipioDescarregamento,
      placa: dados.placa,
      renavam: dados.renavam,
      taraKg: dados.taraKg,
      capacidadeKg: dados.capacidadeKg,
      capacidadeM3: dados.capacidadeM3,
      condutorNome: dados.condutorNome,
      condutorCpf: dados.condutorCpf,
      rntrc: dados.rntrc,
      seguradoraNome: dados.seguradoraNome,
      seguradoraCnpj: dados.seguradoraCnpj,
      apolice: dados.apolice,
      averbacao: dados.averbacao,
      valorCarga: dados.valorCarga,
      pesoBruto: dados.pesoBruto,
      documentos: { create: ctes.map((cte) => ({ cteId: cte.id })) },
    },
    include: inclusao,
  });
}

async function guardar(id: string, mensagem: string, pedido: unknown) {
  return prisma.mdfe.update({
    where: { id },
    data: {
      pedidoPreparado: pedido as Prisma.InputJsonValue,
      mensagemProvedor: mensagem,
    },
  });
}

export async function emitirMdfe(id: string) {
  const mdfe = await obterMdfe(id);
  const provedor = obterProvedorMdfe();
  const rascunho = rascunhoDe(mdfe);
  try {
    await provedor.emitir(rascunho);
  } catch (erro) {
    if (erro instanceof AppError && erro.codigo === "EMISSAO_ADIADA") {
      return guardar(id, erro.message, provedor.prepararEmissao(rascunho));
    }
    throw erro;
  }
  return mdfe;
}

export async function encerrarMdfe(id: string) {
  const mdfe = await obterMdfe(id);
  if (!mdfe.chave) throw new AppError("O encerramento só vale depois da autorização.", 400, "DADOS_INVALIDOS");
  const provedor = obterProvedorMdfe();
  try {
    await provedor.encerrar(mdfe.chave, mdfe.ufFim || "", mdfe.municipioDescarregamento || "");
  } catch (erro) {
    if (erro instanceof AppError && erro.codigo === "EMISSAO_ADIADA") {
      return guardar(id, erro.message, provedor.prepararEncerramento(mdfe.chave, mdfe.ufFim || "", mdfe.municipioDescarregamento || ""));
    }
    throw erro;
  }
  return mdfe;
}

export async function cancelarMdfe(id: string, justificativa: string) {
  const mdfe = await obterMdfe(id);
  if (!mdfe.chave) throw new AppError("O cancelamento só vale depois da autorização.", 400, "DADOS_INVALIDOS");
  const provedor = obterProvedorMdfe();
  try {
    await provedor.cancelar(mdfe.chave, justificativa);
  } catch (erro) {
    if (erro instanceof AppError && erro.codigo === "EMISSAO_ADIADA") {
      return guardar(id, erro.message, provedor.prepararCancelamento(mdfe.chave, justificativa));
    }
    throw erro;
  }
  return mdfe;
}

export function totaisDo(mdfe: { valorCarga: Prisma.Decimal | null; documentos: { cte: { quantidadeCarga: Prisma.Decimal | null; valorPrestacao: Prisma.Decimal | null } }[] }) {
  const cubagem = mdfe.documentos.reduce((soma, documento) => soma + (numero(documento.cte.quantidadeCarga) ?? 0), 0);
  const servico = mdfe.documentos.reduce((soma, documento) => soma + (numero(documento.cte.valorPrestacao) ?? 0), 0);
  return {
    ctes: mdfe.documentos.length,
    cubagemM3: Math.round(cubagem * 1000) / 1000,
    valorServico: servico,
    valorCarga: numero(mdfe.valorCarga),
  };
}
