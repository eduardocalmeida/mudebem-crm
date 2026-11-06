import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { obterProvedorCte } from "@/server/cte/provedor";
import { atorVazio, lerRascunho, type AtorCte, type RascunhoCte } from "@/server/cte/rascunho";

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

function cubagemDe(itens: { quantidade: number; volumeUnitario: Prisma.Decimal }[], volumeTexto: string | null) {
  const dosItens = itens.reduce((soma, item) => soma + item.quantidade * Number(item.volumeUnitario), 0);
  if (dosItens > 0) return Math.round(dosItens * 1000) / 1000;
  const lido = Number(String(volumeTexto ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(lido) && lido > 0 ? lido : null;
}

export async function montarRascunhoDoProcesso(processoId: string): Promise<RascunhoCte> {
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    include: { cliente: true, contato: true, itensInventario: true },
  });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const cubagem = cubagemDe(processo.itensInventario, processo.volume);
  const predominante = processo.itensInventario.reduce<{ nome: string; volume: number } | null>((melhor, item) => {
    const volume = item.quantidade * Number(item.volumeUnitario);
    if (!melhor || volume > melhor.volume) return { nome: item.nome, volume };
    return melhor;
  }, null);
  const valorAprovado = numero(processo.valorAprovado);
  const valorTotal = numero(processo.valorTotal);
  const valorFrete = numero(processo.valorFrete);
  const valorServico = valorAprovado ?? valorTotal ?? valorFrete;
  const origem = partirEndereco(processo.origemEndereco);
  const destino = partirEndereco(processo.destinoEndereco);
  const ie = processo.cliente.inscricaoEstadual?.trim() || null;
  const contribuicao = ie && ie.toUpperCase() !== "ISENTO" ? 1 : ie?.toUpperCase() === "ISENTO" ? 2 : 9;
  const documento = processo.cliente.cnpj;
  const remetente: AtorCte = {
    ...atorVazio(processo.cliente.nome),
    documento,
    ie,
    email: processo.cliente.email,
    telefone: processo.contato?.telefone || processo.cliente.telefone,
    endereco: origem.endereco,
    numero: origem.numero,
    cidade: processo.origemCidade,
    uf: processo.origemUf,
  };
  const destinatario: AtorCte = {
    ...atorVazio(processo.contato?.nome || processo.cliente.nome),
    documento,
    ie,
    email: processo.contato?.email || processo.cliente.email,
    telefone: processo.contato?.telefone || processo.cliente.telefone,
    endereco: destino.endereco,
    numero: destino.numero,
    cidade: processo.destinoCidade,
    uf: processo.destinoUf,
  };
  const chaveNf = (processo.numeroNf ?? "").replace(/\D/g, "");
  const base = lerRascunho(null);
  return {
    ...base,
    contribuicaoTomador: contribuicao,
    inicioCidade: processo.origemCidade,
    inicioUf: processo.origemUf,
    fimCidade: processo.destinoCidade,
    fimUf: processo.destinoUf,
    remetente,
    destinatario,
    valorServico,
    valorReceber: valorServico,
    componentes: valorFrete != null ? [{ nome: "Valor do Frete", valor: valorFrete }] : [],
    produtoPredominante: predominante?.nome || "Móveis e utensílios domésticos",
    cubagemM3: cubagem,
    documentos: processo.numeroNf
      ? [{ tipo: chaveNf.length === 44 ? 1 : 3, chave: chaveNf.length === 44 ? chaveNf : null, numero: chaveNf.length === 44 ? null : processo.numeroNf }]
      : [],
    rntrc: processo.motoristaAntt,
    veiculo: processo.motoristaPlaca,
    motorista: processo.motoristaNome,
    observacoes: processo.itensEspeciais,
  };
}

function colunas(rascunho: RascunhoCte) {
  return {
    finalidade: rascunho.finalidade,
    tipoServico: rascunho.tipoServico,
    indicadorTomador: rascunho.indicadorTomador,
    contribuicaoTomador: rascunho.contribuicaoTomador,
    classificacaoTributaria: rascunho.situacaoIcms,
    regimeTributario: rascunho.regime,
    partilhaIcms: rascunho.partilhaIcms,
    rascunho: rascunho as unknown as Prisma.InputJsonValue,
    remetenteNome: rascunho.remetente.nome || null,
    remetenteDocumento: rascunho.remetente.documento,
    remetenteMunicipio: rascunho.remetente.cidade,
    remetenteUf: rascunho.remetente.uf,
    destinatarioNome: rascunho.destinatario.nome || null,
    destinatarioDocumento: rascunho.destinatario.documento,
    destinatarioMunicipio: rascunho.destinatario.cidade,
    destinatarioUf: rascunho.destinatario.uf,
    tomador: String(rascunho.indicadorTomador),
    cfop: rascunho.cfop,
    naturezaOperacao: rascunho.naturezaOperacao,
    modal: rascunho.modal,
    municipioInicio: rascunho.inicioCidade,
    ufInicio: rascunho.inicioUf,
    municipioFim: rascunho.fimCidade,
    ufFim: rascunho.fimUf,
    valorPrestacao: rascunho.valorServico,
    produtoPredominante: rascunho.produtoPredominante,
    valorCarga: rascunho.valorMercadoria,
    quantidadeCarga: rascunho.cubagemM3,
    unidadeCarga: "M3",
    rntrc: rascunho.rntrc,
    documentos: rascunho.documentos as unknown as Prisma.InputJsonValue,
    componentes: rascunho.componentes as unknown as Prisma.InputJsonValue,
    icmsCst: rascunho.situacaoIcms,
    icmsBase: rascunho.baseIcms,
    icmsAliquota: rascunho.aliquotaIcms,
    icmsValor: rascunho.valorIcms,
    emitenteNome: process.env.WEBMANIA_EMITENTE_NOME || null,
    emitenteDocumento: process.env.WEBMANIA_EMITENTE_CNPJ || null,
    emitenteIe: process.env.WEBMANIA_EMITENTE_IE || null,
  };
}

export async function obterOuPreencherCte(processoId: string) {
  const existente = await prisma.cte.findFirst({ where: { processoId }, orderBy: { criadoEm: "desc" } });
  if (existente) return existente;
  const rascunho = await montarRascunhoDoProcesso(processoId);
  return prisma.cte.create({ data: { processoId, status: "RASCUNHO", ...colunas(rascunho) } });
}

export async function atualizarRascunho(cteId: string, rascunho: RascunhoCte) {
  return prisma.cte.update({ where: { id: cteId }, data: colunas(rascunho) });
}

export async function repreencherCte(processoId: string) {
  const atual = await obterOuPreencherCte(processoId);
  if (atual.status !== "RASCUNHO") {
    throw new AppError("Só um rascunho pode ser preenchido de novo a partir do processo.", 400, "DADOS_INVALIDOS");
  }
  const rascunho = await montarRascunhoDoProcesso(processoId);
  return atualizarRascunho(atual.id, rascunho);
}

export async function duplicarCte(cteId: string) {
  const atual = await prisma.cte.findUnique({ where: { id: cteId } });
  if (!atual) throw new AppError("CT-e não encontrado.", 404, "NAO_ENCONTRADO");
  const rascunho = lerRascunho(atual.rascunho);
  return prisma.cte.create({
    data: {
      processoId: atual.processoId,
      status: "RASCUNHO",
      ...colunas({ ...rascunho, finalidade: 0 }),
      mensagemProvedor: `Cópia do CT-e ${atual.numero || atual.id}.`,
    },
  });
}

async function guardarPedido(cteId: string) {
  const cte = await prisma.cte.findUnique({ where: { id: cteId } });
  if (!cte) throw new AppError("CT-e não encontrado.", 404, "NAO_ENCONTRADO");
  const provedor = obterProvedorCte();
  return { cte, provedor, rascunho: lerRascunho(cte.rascunho) };
}

export async function emitirCte(processoId: string) {
  const cte = await obterOuPreencherCte(processoId);
  const provedor = obterProvedorCte();
  const rascunho = lerRascunho(cte.rascunho);
  try {
    await provedor.emitir(rascunho);
  } catch (erro) {
    if (erro instanceof AppError && erro.codigo === "EMISSAO_ADIADA") {
      return prisma.cte.update({
        where: { id: cte.id },
        data: {
          provedor: provedor.nome,
          pedidoPreparado: provedor.prepararEmissao(rascunho) as unknown as Prisma.InputJsonValue,
          mensagemProvedor: erro.message,
        },
      });
    }
    throw erro;
  }
  throw new AppError("O provedor não concluiu a emissão.", 501, "EMISSAO_ADIADA");
}

export async function cancelarCte(cteId: string, justificativa: string) {
  const { cte, provedor } = await guardarPedido(cteId);
  if (!cte.chave) throw new AppError("O cancelamento só vale depois da autorização.", 400, "DADOS_INVALIDOS");
  try {
    await provedor.cancelar(cte.chave, justificativa);
  } catch (erro) {
    if (erro instanceof AppError && erro.codigo === "EMISSAO_ADIADA") {
      return prisma.cte.update({
        where: { id: cte.id },
        data: {
          pedidoPreparado: provedor.prepararCancelamento(cte.chave, justificativa) as unknown as Prisma.InputJsonValue,
          mensagemProvedor: erro.message,
        },
      });
    }
    throw erro;
  }
  throw new AppError("O provedor não concluiu o cancelamento.", 501, "EMISSAO_ADIADA");
}

export async function corrigirCte(cteId: string, grupo: string, campo: string, valor: string) {
  const { cte, provedor } = await guardarPedido(cteId);
  if (!cte.chave) throw new AppError("A carta de correção só vale depois da autorização.", 400, "DADOS_INVALIDOS");
  try {
    await provedor.cartaCorrecao(cte.chave, grupo, campo, valor);
  } catch (erro) {
    if (erro instanceof AppError && erro.codigo === "EMISSAO_ADIADA") {
      return prisma.cte.update({
        where: { id: cte.id },
        data: {
          pedidoPreparado: provedor.prepararCartaCorrecao(cte.chave, grupo, campo, valor) as unknown as Prisma.InputJsonValue,
          mensagemProvedor: erro.message,
        },
      });
    }
    throw erro;
  }
  throw new AppError("O provedor não concluiu a carta de correção.", 501, "EMISSAO_ADIADA");
}

export function urlDacte(chave: string | null) {
  if (!chave) return null;
  const base = (process.env.WEBMANIA_URL_BASE || "https://api.webmania.com.br").replace(/\/$/, "");
  return `${base}/dacte/${chave}`;
}
