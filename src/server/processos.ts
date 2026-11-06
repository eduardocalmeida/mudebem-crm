import { Prisma } from "@prisma/client";
import { autoridadeDo, nomeAtor, semIndefinidos, type Ator } from "@/lib/ator";
import {
  camposDoPapel,
  etapaInicial,
  podeCriarProcesso,
  rotuloCampo,
  rotuloEtapa,
  validarTransicao,
  type Campo,
  type Etapa,
} from "@/lib/domain";
import { carregarEtapas } from "@/server/etapas";
import { criarTarefasDaEtapa } from "@/server/tarefas";
import { AppError } from "@/lib/errors";
import { anoSaoPaulo, dataParaIso, paraDataBanco } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { DadosCriarProcesso, DadosPatchProcesso } from "@/lib/schemas";
import { includeProcesso, serializarProcesso, type EventoDTO, type ProcessoDTO } from "@/server/serializers";

type Tx = Prisma.TransactionClient;

const ROTULOS_EVENTO = {
  CRIACAO: "CRIACAO",
  MUDANCA_ETAPA: "MUDANCA_ETAPA",
  NOTA: "NOTA",
  ATUALIZACAO: "ATUALIZACAO",
  ANEXO: "ANEXO",
} as const;

function campoPermissao(chave: string): Campo {
  return (chave === "contato" ? "contatoId" : chave) as Campo;
}

function camposProibidos(ator: Ator, campos: string[]): Campo[] {
  if (ator.tipo === "api" || ator.papel === "ADMIN") return [];
  const permitidos = new Set(camposDoPapel(ator.papel));
  return campos.map(campoPermissao).filter((campo) => !permitidos.has(campo));
}

async function proximoCodigo(tx: Tx) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(42811986)`;
  const prefixo = `MB-${anoSaoPaulo()}-`;
  const ultimo = await tx.processo.findFirst({
    where: { codigo: { startsWith: prefixo } },
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const sequencia = ultimo ? Number(ultimo.codigo.slice(prefixo.length)) + 1 : 1;
  return `${prefixo}${String(sequencia).padStart(4, "0")}`;
}

async function resolverCliente(
  tx: Tx,
  clienteId: string | null | undefined,
  cliente: DadosCriarProcesso["cliente"],
) {
  if (clienteId) {
    const existente = await tx.cliente.findUnique({ where: { id: clienteId } });
    if (!existente) throw new AppError("Cliente não encontrado.", 404, "NAO_ENCONTRADO");
    return existente.id;
  }
  if (!cliente?.nome) throw new AppError("Informe o cliente.", 400, "DADOS_INVALIDOS");
  if (cliente.cnpj) {
    const porCnpj = await tx.cliente.findUnique({ where: { cnpj: cliente.cnpj } });
    if (porCnpj) return porCnpj.id;
  }
  const criado = await tx.cliente.create({
    data: {
      nome: cliente.nome,
      cnpj: cliente.cnpj ?? null,
      email: cliente.email ?? null,
      telefone: cliente.telefone ?? null,
      endereco: cliente.endereco ?? null,
      cidade: cliente.cidade ?? null,
      uf: cliente.uf ?? null,
      inscricaoEstadual: cliente.inscricaoEstadual ?? null,
      site: cliente.site ?? null,
    },
  });
  return criado.id;
}

function patchExtras(valor: unknown): Record<string, unknown> {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) return { ...(valor as Record<string, unknown>) };
  return {};
}

async function resolverContato(
  tx: Tx,
  clienteId: string,
  contatoId: string | null | undefined,
  contato: DadosCriarProcesso["contato"],
) {
  if (contatoId) {
    const existente = await tx.contato.findUnique({ where: { id: contatoId } });
    if (!existente || existente.clienteId !== clienteId) {
      throw new AppError("Contato não encontrado neste cliente.", 400, "DADOS_INVALIDOS");
    }
    return existente.id;
  }
  if (!contato?.nome) return null;
  if (contato.email) {
    const porEmail = await tx.contato.findFirst({ where: { clienteId, email: contato.email } });
    if (porEmail) return porEmail.id;
  }
  const mesmoNome = await tx.contato.findFirst({
    where: { clienteId, nome: { equals: contato.nome, mode: "insensitive" } },
  });
  if (mesmoNome) {
    const novo = (contato.telefone ?? "").replace(/\D/g, "");
    const antigo = (mesmoNome.telefone ?? "").replace(/\D/g, "");
    if (novo.length >= 8 && antigo.length >= 8 && novo.slice(-8) === antigo.slice(-8)) return mesmoNome.id;
    throw new AppError("Já existe um contato com este nome neste cliente. Selecione-o na busca.", 409, "CONFLITO");
  }
  const total = await tx.contato.count({ where: { clienteId } });
  const criado = await tx.contato.create({
    data: {
      clienteId,
      nome: contato.nome,
      email: contato.email ?? null,
      telefone: contato.telefone ?? null,
      cargo: contato.cargo ?? null,
      cpf: contato.cpf ?? null,
      documento: contato.documento ?? null,
      principal: total === 0,
    },
  });
  return criado.id;
}

export function responsavelNaCriacao(
  ator: Ator,
  dados: {
    responsavelId?: string | null;
    formulario?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    gclid?: string | null;
    fbclid?: string | null;
  },
) {
  const campanha = dados.formulario === "orcamento-site" || Boolean(dados.utmSource || dados.utmMedium || dados.utmCampaign || dados.gclid || dados.fbclid);
  if (campanha) return null;
  if (ator.tipo === "usuario") return ator.id;
  return dados.responsavelId ?? null;
}

async function exigirResponsavel(tx: Tx, responsavelId: string | null | undefined) {
  if (!responsavelId) return;
  const usuario = await tx.usuario.findUnique({ where: { id: responsavelId } });
  if (!usuario || !usuario.ativo) throw new AppError("Responsável não encontrado.", 400, "DADOS_INVALIDOS");
}

async function carregarEventos(processoId: string): Promise<EventoDTO[]> {
  const eventos = await prisma.evento.findMany({
    where: { processoId },
    orderBy: { criadoEm: "desc" },
  });
  return eventos.map((evento) => ({
    id: evento.id,
    tipo: evento.tipo,
    mensagem: evento.mensagem,
    etapaDe: evento.etapaDe,
    etapaPara: evento.etapaPara,
    autor: evento.origem,
    criadoEm: evento.criadoEm.toISOString(),
  }));
}

async function carregarAnexos(processoId: string) {
  const anexos = await prisma.anexo.findMany({
    where: { processoId },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      nomeArquivo: true,
      tipoMime: true,
      tamanho: true,
      criadoEm: true,
      usuario: { select: { nome: true } },
    },
  });
  return anexos.map((anexo) => ({
    id: anexo.id,
    nomeArquivo: anexo.nomeArquivo,
    tipoMime: anexo.tipoMime,
    tamanho: anexo.tamanho,
    autor: anexo.usuario?.nome ?? null,
    criadoEm: anexo.criadoEm.toISOString(),
  }));
}

export async function obterProcesso(id: string, comHistorico = false): Promise<ProcessoDTO> {
  const processo = await prisma.processo.findUnique({ where: { id }, include: includeProcesso });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  if (!comHistorico) return serializarProcesso(processo);
  const [eventos, anexos] = await Promise.all([carregarEventos(id), carregarAnexos(id)]);
  return serializarProcesso(processo, { eventos, anexos });
}

export async function listarProcessos(filtro: {
  q?: string;
  etapa?: Etapa;
  canal?: DadosCriarProcesso["canal"];
  clienteId?: string;
  etiqueta?: string;
  responsavelId?: string;
  dataColetaDe?: string;
  dataColetaAte?: string;
  pagina?: number;
  porPagina?: number;
  limite?: number;
}) {
  const pagina = Math.max(1, filtro.pagina ?? 1);
  const porPagina = Math.min(100, Math.max(1, filtro.porPagina ?? 50));
  const where: Prisma.ProcessoWhereInput = {};
  if (filtro.etapa) where.etapa = filtro.etapa;
  if (filtro.canal) where.canal = filtro.canal;
  if (filtro.clienteId) where.clienteId = filtro.clienteId;
  if (filtro.etiqueta) where.etiqueta = filtro.etiqueta;
  if (filtro.responsavelId) where.responsavelId = filtro.responsavelId;
  if (filtro.dataColetaDe || filtro.dataColetaAte) {
    where.dataColeta = {};
    if (filtro.dataColetaDe) where.dataColeta.gte = paraDataBanco(filtro.dataColetaDe) ?? undefined;
    if (filtro.dataColetaAte) where.dataColeta.lte = paraDataBanco(filtro.dataColetaAte) ?? undefined;
  }
  const termo = filtro.q?.trim();
  if (termo) {
    where.OR = [
      { titulo: { contains: termo, mode: "insensitive" } },
      { codigo: { contains: termo, mode: "insensitive" } },
      { colaborador: { contains: termo, mode: "insensitive" } },
      { origemCidade: { contains: termo, mode: "insensitive" } },
      { destinoCidade: { contains: termo, mode: "insensitive" } },
      { numeroOc: { contains: termo, mode: "insensitive" } },
      { numeroNf: { contains: termo, mode: "insensitive" } },
      { cliente: { nome: { contains: termo, mode: "insensitive" } } },
    ];
  }

  const take = filtro.limite ?? porPagina;
  const skip = filtro.limite ? 0 : (pagina - 1) * porPagina;
  const [total, registros] = await prisma.$transaction([
    prisma.processo.count({ where }),
    prisma.processo.findMany({
      where,
      include: includeProcesso,
      orderBy: { atualizadoEm: "desc" },
      skip,
      take,
    }),
  ]);

  return {
    dados: registros.map((item) => serializarProcesso(item)),
    total,
    pagina: filtro.limite ? 1 : pagina,
    porPagina: filtro.limite ?? porPagina,
  };
}

export async function criarProcesso(ator: Ator, entrada: DadosCriarProcesso): Promise<ProcessoDTO> {
  if (!podeCriarProcesso(autoridadeDo(ator))) {
    throw new AppError("Seu papel não pode abrir processos.", 403, "PROIBIDO");
  }
  const dados = semIndefinidos(entrada as unknown as Record<string, unknown>) as DadosCriarProcesso;
  const etapas = await carregarEtapas();
  const inicial = etapaInicial(etapas);
  const etapa: Etapa = dados.etapa ?? inicial;
  if (!etapas.some((item) => item.slug === etapa && item.ativa)) {
    throw new AppError("Etapa inválida.", 400, "DADOS_INVALIDOS");
  }
  if (etapa !== inicial) {
    const motivo = validarTransicao(autoridadeDo(ator), inicial, etapa, etapas);
    if (motivo) throw new AppError(motivo, 403, "PROIBIDO");
  }

  const id = await prisma.$transaction(async (tx) => {
    const clienteId = await resolverCliente(tx, dados.clienteId, dados.cliente);
    const contatoId = await resolverContato(tx, clienteId, dados.contatoId, dados.contato);
    const codigo = await proximoCodigo(tx);
    const responsavelId = responsavelNaCriacao(ator, dados);
    await exigirResponsavel(tx, responsavelId);
    const criado = await tx.processo.create({
      data: {
        codigo,
        titulo: dados.titulo || codigo,
        etapa,
        canal: dados.canal,
        clienteId,
        contatoId,
        colaborador: dados.colaborador ?? null,
        origemEndereco: dados.origemEndereco ?? null,
        origemCidade: dados.origemCidade ?? null,
        origemUf: dados.origemUf ?? null,
        origemReferencia: dados.origemReferencia ?? null,
        origemAndar: dados.origemAndar ?? null,
        origemElevador: dados.origemElevador ?? null,
        origemImovel: dados.origemImovel ?? null,
        destinoEndereco: dados.destinoEndereco ?? null,
        destinoCidade: dados.destinoCidade ?? null,
        destinoUf: dados.destinoUf ?? null,
        destinoReferencia: dados.destinoReferencia ?? null,
        destinoAndar: dados.destinoAndar ?? null,
        destinoElevador: dados.destinoElevador ?? null,
        destinoImovel: dados.destinoImovel ?? null,
        modalidade: dados.modalidade ?? null,
        descricaoColeta: dados.descricaoColeta ?? null,
        descricaoEntrega: dados.descricaoEntrega ?? null,
        embalagemNecessaria: dados.embalagemNecessaria ?? null,
        volume: dados.volume ?? null,
        itensEspeciais: dados.itensEspeciais ?? null,
        dataPretendida: paraDataBanco(dados.dataPretendida),
        dataColeta: paraDataBanco(dados.dataColeta),
        dataEntrega: paraDataBanco(dados.dataEntrega),
        dataPrevista: paraDataBanco(dados.dataPrevista),
        dataEmissao: paraDataBanco(dados.dataEmissao),
        diasParaColetar: dados.diasParaColetar ?? null,
        diasParaViagem: dados.diasParaViagem ?? null,
        motoristaNome: dados.motoristaNome ?? null,
        motoristaPlaca: dados.motoristaPlaca ?? null,
        motoristaAntt: dados.motoristaAntt ?? null,
        motoristaCnh: dados.motoristaCnh ?? null,
        motoristaCpf: dados.motoristaCpf ?? null,
        inventario: dados.inventario ?? null,
        valorCotado: dados.valorCotado ?? null,
        valorAprovado: dados.valorAprovado ?? null,
        valorFrete: dados.valorFrete ?? null,
        valorSeguro: dados.valorSeguro ?? null,
        valorTransporte: dados.valorTransporte ?? null,
        valorTotal: dados.valorTotal ?? null,
        formaPagamento: dados.formaPagamento ?? null,
        validadeProposta: paraDataBanco(dados.validadeProposta),
        linkProposta: dados.linkProposta ?? null,
        linkContrato: dados.linkContrato ?? null,
        linkContratoCarreteiro: dados.linkContratoCarreteiro ?? null,
        linkOs: dados.linkOs ?? null,
        linkRecibo: dados.linkRecibo ?? null,
        fonte: dados.fonte ?? null,
        utmSource: dados.utmSource ?? null,
        utmMedium: dados.utmMedium ?? null,
        utmCampaign: dados.utmCampaign ?? null,
        utmTerm: dados.utmTerm ?? null,
        utmContent: dados.utmContent ?? null,
        fbclid: dados.fbclid ?? null,
        gclid: dados.gclid ?? null,
        metaCampaignId: dados.metaCampaignId ?? null,
        metaAdId: dados.metaAdId ?? null,
        referrer: dados.referrer ?? null,
        formulario: dados.formulario ?? null,
        numeroOc: dados.numeroOc ?? null,
        numeroCte: dados.numeroCte ?? null,
        numeroNf: dados.numeroNf ?? null,
        dataVencimento: paraDataBanco(dados.dataVencimento),
        dataRecebimento: paraDataBanco(dados.dataRecebimento),
        responsavelId,
        ...(dados.dataEmbalagem !== undefined ? { extras: { fichaDatas: { dataEmbalagem: dados.dataEmbalagem } } } : {}),
      },
    });
    await tx.evento.create({
      data: {
        processoId: criado.id,
        tipo: ROTULOS_EVENTO.CRIACAO,
        mensagem: `Processo criado na etapa ${rotuloEtapa(etapa)}.`,
        etapaPara: etapa,
        usuarioId: ator.tipo === "usuario" ? ator.id : null,
        origem: nomeAtor(ator),
      },
    });
    return criado.id;
  });

  return obterProcesso(id, true);
}

export async function atualizarProcesso(ator: Ator, id: string, entrada: DadosPatchProcesso): Promise<ProcessoDTO> {
  const patch = semIndefinidos(entrada as unknown as Record<string, unknown>) as DadosPatchProcesso;
  const chaves = Object.keys(patch);
  if (chaves.length === 0) {
    throw new AppError("Informe ao menos um campo para atualizar.", 400, "DADOS_INVALIDOS");
  }
  const proibidos = camposProibidos(ator, chaves);
  if (proibidos.length > 0) {
    throw new AppError(
      `Seu papel não pode alterar: ${proibidos.map((campo) => rotuloCampo(campo)).join(", ")}.`,
      403,
      "PROIBIDO",
    );
  }

  await prisma.$transaction(async (tx) => {
    const atual = await tx.processo.findUnique({ where: { id } });
    if (!atual) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");

    const data: Prisma.ProcessoUpdateInput = {};
    const escalar = data as Record<string, unknown>;
    const alterados: Campo[] = [];

    const texto = (campo: Campo, valorAtual: string | null, valorNovo: string | null | undefined) => {
      if (valorNovo === undefined || (valorAtual ?? null) === valorNovo) return;
      escalar[campo] = valorNovo;
      alterados.push(campo);
    };

    texto("titulo", atual.titulo, patch.titulo);
    if (patch.canal !== undefined && patch.canal !== atual.canal) {
      data.canal = patch.canal;
      alterados.push("canal");
    }

    let clienteId = atual.clienteId;
    if (patch.clienteId && patch.clienteId !== atual.clienteId) {
      await resolverCliente(tx, patch.clienteId, null);
      data.cliente = { connect: { id: patch.clienteId } };
      clienteId = patch.clienteId;
      alterados.push("clienteId");
    }

    const mexeContato = Object.prototype.hasOwnProperty.call(patch, "contatoId") || Boolean(patch.contato);
    if (mexeContato) {
      const contatoId = await resolverContato(tx, clienteId, patch.contatoId, patch.contato);
      if (contatoId !== atual.contatoId) {
        data.contato = contatoId ? { connect: { id: contatoId } } : { disconnect: true };
        alterados.push("contatoId");
      }
    } else if (patch.clienteId && patch.clienteId !== atual.clienteId && atual.contatoId) {
      data.contato = { disconnect: true };
      if (!alterados.includes("contatoId")) alterados.push("contatoId");
    }

    texto("colaborador", atual.colaborador, patch.colaborador);
    texto("origemEndereco", atual.origemEndereco, patch.origemEndereco);
    texto("origemCidade", atual.origemCidade, patch.origemCidade);
    texto("origemUf", atual.origemUf, patch.origemUf);
    texto("origemReferencia", atual.origemReferencia, patch.origemReferencia);
    texto("origemAndar", atual.origemAndar, patch.origemAndar);
    texto("origemElevador", atual.origemElevador, patch.origemElevador);
    texto("origemImovel", atual.origemImovel, patch.origemImovel);
    texto("destinoEndereco", atual.destinoEndereco, patch.destinoEndereco);
    texto("destinoCidade", atual.destinoCidade, patch.destinoCidade);
    texto("destinoUf", atual.destinoUf, patch.destinoUf);
    texto("destinoReferencia", atual.destinoReferencia, patch.destinoReferencia);
    texto("destinoAndar", atual.destinoAndar, patch.destinoAndar);
    texto("destinoElevador", atual.destinoElevador, patch.destinoElevador);
    texto("destinoImovel", atual.destinoImovel, patch.destinoImovel);
    texto("modalidade", atual.modalidade, patch.modalidade);
    texto("descricaoColeta", atual.descricaoColeta, patch.descricaoColeta);
    texto("descricaoEntrega", atual.descricaoEntrega, patch.descricaoEntrega);
    texto("volume", atual.volume, patch.volume);
    texto("itensEspeciais", atual.itensEspeciais, patch.itensEspeciais);
    texto("motoristaNome", atual.motoristaNome, patch.motoristaNome);
    texto("motoristaPlaca", atual.motoristaPlaca, patch.motoristaPlaca);
    texto("motoristaAntt", atual.motoristaAntt, patch.motoristaAntt);
    texto("motoristaCnh", atual.motoristaCnh, patch.motoristaCnh);
    texto("motoristaCpf", atual.motoristaCpf, patch.motoristaCpf);
    texto("formaPagamento", atual.formaPagamento, patch.formaPagamento);
    texto("linkProposta", atual.linkProposta, patch.linkProposta);
    texto("linkContrato", atual.linkContrato, patch.linkContrato);
    texto("linkContratoCarreteiro", atual.linkContratoCarreteiro, patch.linkContratoCarreteiro);
    texto("linkOs", atual.linkOs, patch.linkOs);
    texto("linkRecibo", atual.linkRecibo, patch.linkRecibo);
    texto("fonte", atual.fonte, patch.fonte);
    texto("utmSource", atual.utmSource, patch.utmSource);
    texto("utmMedium", atual.utmMedium, patch.utmMedium);
    texto("utmCampaign", atual.utmCampaign, patch.utmCampaign);
    texto("utmTerm", atual.utmTerm, patch.utmTerm);
    texto("utmContent", atual.utmContent, patch.utmContent);
    texto("fbclid", atual.fbclid, patch.fbclid);
    texto("gclid", atual.gclid, patch.gclid);
    texto("metaCampaignId", atual.metaCampaignId, patch.metaCampaignId);
    texto("metaAdId", atual.metaAdId, patch.metaAdId);
    texto("referrer", atual.referrer, patch.referrer);
    texto("formulario", atual.formulario, patch.formulario);
    texto("inventario", atual.inventario, patch.inventario);
    if (patch.embalagemNecessaria !== undefined && patch.embalagemNecessaria !== atual.embalagemNecessaria) {
      data.embalagemNecessaria = patch.embalagemNecessaria;
      alterados.push("embalagemNecessaria");
    }
    if (patch.diasParaColetar !== undefined && patch.diasParaColetar !== atual.diasParaColetar) {
      data.diasParaColetar = patch.diasParaColetar;
      alterados.push("diasParaColetar");
    }
    if (patch.diasParaViagem !== undefined && patch.diasParaViagem !== atual.diasParaViagem) {
      data.diasParaViagem = patch.diasParaViagem;
      alterados.push("diasParaViagem");
    }
    texto("numeroOc", atual.numeroOc, patch.numeroOc);
    texto("numeroCte", atual.numeroCte, patch.numeroCte);
    texto("numeroNf", atual.numeroNf, patch.numeroNf);

    const dataCampo = (
      campo: "dataColeta" | "dataEntrega" | "dataPretendida" | "dataPrevista" | "dataEmissao" | "validadeProposta" | "dataVencimento" | "dataRecebimento",
    ) => {
      const valor = patch[campo];
      if (valor === undefined) return;
      if (dataParaIso(atual[campo]) === valor) return;
      data[campo] = paraDataBanco(valor);
      alterados.push(campo);
    };
    dataCampo("dataColeta");
    dataCampo("dataEntrega");
    dataCampo("dataPretendida");
    dataCampo("dataPrevista");
    if (patch.dataEmbalagem !== undefined) {
      const extras = patchExtras(atual.extras);
      const datas = patchExtras(extras.fichaDatas);
      data.extras = { ...extras, fichaDatas: { ...datas, dataEmbalagem: patch.dataEmbalagem } };
    }
    dataCampo("dataEmissao");
    dataCampo("validadeProposta");
    dataCampo("dataVencimento");
    dataCampo("dataRecebimento");

    const dinheiro = (campo: "valorCotado" | "valorAprovado" | "valorFrete" | "valorSeguro" | "valorTransporte" | "valorTotal") => {
      const valor = patch[campo];
      if (valor === undefined) return;
      const atualNumero = atual[campo] == null ? null : atual[campo]!.toNumber();
      if (atualNumero === valor) return;
      data[campo] = valor;
      alterados.push(campo);
    };
    dinheiro("valorCotado");
    dinheiro("valorAprovado");
    dinheiro("valorFrete");
    dinheiro("valorSeguro");
    dinheiro("valorTransporte");
    dinheiro("valorTotal");

    if (patch.responsavelId !== undefined && patch.responsavelId !== atual.responsavelId) {
      await exigirResponsavel(tx, patch.responsavelId);
      data.responsavel = patch.responsavelId ? { connect: { id: patch.responsavelId } } : { disconnect: true };
      alterados.push("responsavelId");
    }

    if (alterados.length === 0) return;

    await tx.processo.update({ where: { id }, data });
    await tx.evento.create({
      data: {
        processoId: id,
        tipo: "ATUALIZACAO",
        mensagem: `Campos atualizados: ${alterados.map((campo) => rotuloCampo(campo)).join(", ")}.`,
        usuarioId: ator.tipo === "usuario" ? ator.id : null,
        origem: nomeAtor(ator),
      },
    });
  });

  return obterProcesso(id, true);
}

export async function moverEtapa(ator: Ator, id: string, etapa: Etapa, observacao?: string | null) {
  const processo = await prisma.processo.findUnique({ where: { id } });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const etapas = await carregarEtapas();
  if (!etapas.some((item) => item.slug === etapa && item.ativa)) {
    throw new AppError("Etapa inválida.", 400, "DADOS_INVALIDOS");
  }
  const motivo = validarTransicao(autoridadeDo(ator), processo.etapa, etapa, etapas);
  if (motivo) {
    const mesma = motivo.includes("já está");
    throw new AppError(motivo, mesma ? 400 : 403, mesma ? "DADOS_INVALIDOS" : "PROIBIDO");
  }

  const texto = observacao?.trim();
  await prisma.$transaction([
    prisma.processo.update({ where: { id }, data: { etapa } }),
    prisma.evento.create({
      data: {
        processoId: id,
        tipo: "MUDANCA_ETAPA",
        etapaDe: processo.etapa,
        etapaPara: etapa,
        mensagem: texto
          ? `Etapa alterada de ${rotuloEtapa(processo.etapa)} para ${rotuloEtapa(etapa)}. ${texto}`
          : `Etapa alterada de ${rotuloEtapa(processo.etapa)} para ${rotuloEtapa(etapa)}.`,
        usuarioId: ator.tipo === "usuario" ? ator.id : null,
        origem: nomeAtor(ator),
      },
    }),
  ]);

  await criarTarefasDaEtapa(id, etapa, processo.responsavelId);
  return { etapaAnterior: processo.etapa, processo: await obterProcesso(id, true) };
}

export async function adicionarNota(ator: Ator, id: string, texto: string) {
  const processo = await prisma.processo.findUnique({ where: { id }, select: { id: true } });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const evento = await prisma.evento.create({
    data: {
      processoId: id,
      tipo: "NOTA",
      mensagem: texto.trim(),
      usuarioId: ator.tipo === "usuario" ? ator.id : null,
      origem: nomeAtor(ator),
    },
  });
  return {
    nota: {
      id: evento.id,
      texto: evento.mensagem,
      autor: evento.origem,
      criadoEm: evento.criadoEm.toISOString(),
    },
    processo: await obterProcesso(id, true),
  };
}
