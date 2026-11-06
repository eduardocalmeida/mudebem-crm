import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { obterEmpresa } from "@/server/empresa";
import { documentoEfetivo, sugerirDocumentoFiscal, type DocumentoFiscal } from "@/server/nfse/regra";
import { obterProvedorNfse, type RascunhoNfse } from "@/server/nfse/webmania";

const CODIGOS = [
  { codigo: "16.02", descricao: "Outros serviços de transporte de natureza municipal", cnae: "4930204", padrao: true },
  { codigo: "26.01", descricao: "Coleta, remessa ou entrega de bens", cnae: "4930204", padrao: false },
];

export async function garantirCodigosServico() {
  for (const codigo of CODIGOS) {
    await prisma.codigoServicoNfse.upsert({
      where: { codigo: codigo.codigo },
      update: {},
      create: codigo,
    });
  }
}

export async function listarCodigosServico() {
  await garantirCodigosServico();
  return prisma.codigoServicoNfse.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } });
}

export async function salvarCodigoServico(id: string, dados: { descricao: string; cnae: string | null; aliquotaIss: number | null; padrao: boolean }) {
  if (dados.padrao) await prisma.codigoServicoNfse.updateMany({ data: { padrao: false } });
  return prisma.codigoServicoNfse.update({ where: { id }, data: dados });
}

function numero(valor: Prisma.Decimal | number | null | undefined) {
  if (valor == null) return null;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : null;
}

function partirEndereco(texto: string | null | undefined) {
  const limpo = texto?.trim() ?? "";
  if (!limpo) return { endereco: null, numero: null };
  const match = limpo.match(/^(.*?)(?:,|\s)\s*(?:n[ºo°.]?\s*)?(\d+[A-Za-z0-9/-]*)\s*$/);
  if (!match || match[1].trim().length < 2) return { endereco: limpo, numero: "S/N" };
  return { endereco: match[1].trim(), numero: match[2] };
}

export function valorDoIss(valorServicos: number | null, aliquotaIss: number | null) {
  if (valorServicos == null || aliquotaIss == null) return null;
  return Math.round(valorServicos * aliquotaIss) / 100;
}

export async function lerEscolhaFiscal(processoId: string) {
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    select: { origemCidade: true, destinoCidade: true, documentoFiscal: true, documentoFiscalManual: true },
  });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const sugerido = sugerirDocumentoFiscal(processo.origemCidade, processo.destinoCidade);
  const efetivo = documentoEfetivo(processo.origemCidade, processo.destinoCidade, processo.documentoFiscal, processo.documentoFiscalManual);
  return { ...processo, sugerido, efetivo };
}

export async function definirDocumentoFiscal(processoId: string, documento: DocumentoFiscal | null) {
  await prisma.processo.update({
    where: { id: processoId },
    data: documento
      ? { documentoFiscal: documento, documentoFiscalManual: true }
      : { documentoFiscal: null, documentoFiscalManual: false },
  });
  return lerEscolhaFiscal(processoId);
}

export async function preencherNfse(processoId: string) {
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    include: { cliente: true, contato: true },
  });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const codigos = await listarCodigosServico();
  const padrao = codigos.find((codigo) => codigo.padrao) ?? codigos[0];
  const endereco = partirEndereco(processo.origemEndereco || processo.cliente.endereco);
  const documento = (processo.cliente.cnpj || processo.contato?.cpf || "").replace(/\D/g, "");
  const valor = numero(processo.valorAprovado) ?? numero(processo.valorTotal) ?? numero(processo.valorFrete);
  const aliquotaIss = numero(padrao?.aliquotaIss);
  const cidade = processo.origemCidade;
  const empresa = await obterEmpresa();
  return {
    prestadorNome: empresa.nome || process.env.WEBMANIA_EMITENTE_NOME || null,
    prestadorDocumento: empresa.cnpj || process.env.WEBMANIA_EMITENTE_CNPJ || null,
    prestadorMunicipio: empresa.municipio,
    prestadorUf: empresa.uf,
    prestadorIbge: empresa.codigoIbge,
    tomadorNome: processo.cliente.nome,
    tomadorDocumento: documento || null,
    tomadorEmail: processo.contato?.email || processo.cliente.email,
    tomadorEndereco: endereco.endereco,
    tomadorNumero: endereco.numero,
    tomadorBairro: null,
    tomadorCidade: cidade,
    tomadorUf: processo.origemUf,
    tomadorCep: null,
    municipioPrestacao: cidade,
    ufPrestacao: processo.origemUf,
    discriminacao: [
      `Serviço de mudança no município de ${cidade || "prestação"}.`,
      processo.origemEndereco ? `Origem: ${processo.origemEndereco}.` : "",
      processo.destinoEndereco ? `Destino: ${processo.destinoEndereco}.` : "",
      processo.volume ? `Volume: ${processo.volume}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    codigoServico: padrao?.codigo ?? null,
    cnae: padrao?.cnae ?? null,
    aliquotaIss,
    valorIss: valorDoIss(valor, aliquotaIss),
    issRetido: false,
    valorServicos: valor,
    deducoes: null,
  };
}

export async function obterOuPreencherNfse(processoId: string) {
  const existente = await prisma.nfse.findFirst({ where: { processoId }, orderBy: { criadoEm: "desc" } });
  if (existente) return existente;
  const dados = await preencherNfse(processoId);
  return prisma.nfse.create({ data: { processoId, status: "RASCUNHO", ...dados } });
}

export function rascunhoDe(nfse: {
  prestadorMunicipio: string | null;
  prestadorUf: string | null;
  prestadorIbge: string | null;
  tomadorNome: string | null;
  tomadorDocumento: string | null;
  tomadorEmail: string | null;
  tomadorEndereco: string | null;
  tomadorNumero: string | null;
  tomadorBairro: string | null;
  tomadorCidade: string | null;
  tomadorUf: string | null;
  tomadorCep: string | null;
  municipioPrestacao: string | null;
  discriminacao: string | null;
  codigoServico: string | null;
  cnae: string | null;
  aliquotaIss: Prisma.Decimal | null;
  issRetido: boolean;
  aliquotaPis: Prisma.Decimal | null;
  aliquotaCofins: Prisma.Decimal | null;
  aliquotaCsll: Prisma.Decimal | null;
  aliquotaIr: Prisma.Decimal | null;
  aliquotaInss: Prisma.Decimal | null;
  valorServicos: Prisma.Decimal | null;
  deducoes: Prisma.Decimal | null;
  ibsSituacao: string | null;
  ibsClassificacao: string | null;
}): RascunhoNfse {
  return {
    prestadorMunicipio: nfse.prestadorMunicipio,
    prestadorUf: nfse.prestadorUf,
    prestadorIbge: nfse.prestadorIbge,
    tomadorNome: nfse.tomadorNome,
    tomadorDocumento: nfse.tomadorDocumento,
    tomadorEmail: nfse.tomadorEmail,
    tomadorEndereco: nfse.tomadorEndereco,
    tomadorNumero: nfse.tomadorNumero,
    tomadorBairro: nfse.tomadorBairro,
    tomadorCidade: nfse.tomadorCidade,
    tomadorUf: nfse.tomadorUf,
    tomadorCep: nfse.tomadorCep,
    municipioPrestacao: nfse.municipioPrestacao,
    discriminacao: nfse.discriminacao,
    codigoServico: nfse.codigoServico,
    cnae: nfse.cnae,
    aliquotaIss: numero(nfse.aliquotaIss),
    issRetido: nfse.issRetido,
    aliquotaPis: numero(nfse.aliquotaPis),
    aliquotaCofins: numero(nfse.aliquotaCofins),
    aliquotaCsll: numero(nfse.aliquotaCsll),
    aliquotaIr: numero(nfse.aliquotaIr),
    aliquotaInss: numero(nfse.aliquotaInss),
    valorServicos: numero(nfse.valorServicos),
    deducoes: numero(nfse.deducoes),
    ibsSituacao: nfse.ibsSituacao,
    ibsClassificacao: nfse.ibsClassificacao,
  };
}

export async function salvarNfse(id: string, dados: RascunhoNfse) {
  const atual = await prisma.nfse.findUnique({ where: { id }, select: { status: true } });
  if (!atual) throw new AppError("NFS-e não encontrada.", 404, "NAO_ENCONTRADO");
  if (atual.status !== "RASCUNHO") throw new AppError("Só um rascunho pode ser editado.", 400, "DADOS_INVALIDOS");
  return prisma.nfse.update({
    where: { id },
    data: {
      ...dados,
      valorIss: valorDoIss(dados.valorServicos, dados.aliquotaIss),
      aliquotaIss: dados.aliquotaIss,
    },
  });
}

export async function emitirNfse(id: string) {
  const nfse = await prisma.nfse.findUnique({ where: { id } });
  if (!nfse) throw new AppError("NFS-e não encontrada.", 404, "NAO_ENCONTRADO");
  const provedor = obterProvedorNfse();
  const rascunho = rascunhoDe(nfse);
  try {
    await provedor.emitir(rascunho);
  } catch (erro) {
    if (erro instanceof AppError && erro.codigo === "EMISSAO_ADIADA") {
      return prisma.nfse.update({
        where: { id },
        data: {
          pedidoPreparado: provedor.prepararEmissao(rascunho) as Prisma.InputJsonValue,
          mensagemProvedor: erro.message,
        },
      });
    }
    throw erro;
  }
  return nfse;
}

export async function cancelarNfse(id: string, motivo: number) {
  const nfse = await prisma.nfse.findUnique({ where: { id } });
  if (!nfse) throw new AppError("NFS-e não encontrada.", 404, "NAO_ENCONTRADO");
  if (!nfse.uuidProvedor) throw new AppError("O cancelamento só vale depois da autorização.", 400, "DADOS_INVALIDOS");
  const provedor = obterProvedorNfse();
  try {
    await provedor.cancelar(nfse.uuidProvedor, motivo);
  } catch (erro) {
    if (erro instanceof AppError && erro.codigo === "EMISSAO_ADIADA") {
      return prisma.nfse.update({
        where: { id },
        data: {
          pedidoPreparado: provedor.prepararCancelamento(nfse.uuidProvedor, motivo) as Prisma.InputJsonValue,
          mensagemProvedor: erro.message,
        },
      });
    }
    throw erro;
  }
  return nfse;
}
