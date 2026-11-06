"use server";

import { interpretarVencimento } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { adicionarItens, ajustarQuantidade, definirValorDeclarado, removerItem } from "@/server/inventario";
import { atualizarVencimentoTarefa } from "@/server/tarefas";
import { cancelarCte, corrigirCte, duplicarCte, emitirCte, obterOuPreencherCte, repreencherCte, atualizarRascunho } from "@/server/cte/cte";
import { lerRascunho, type AtorCte } from "@/server/cte/rascunho";
import { criarTarefa } from "@/server/tarefas";
import { exigirUsuario } from "@/server/session";

function instante(valor: string) {
  return interpretarVencimento(valor);
}

export async function criarTarefaAction(form: FormData) {
  const usuario = await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const vencimento = instante(String(form.get("vencimento") || ""));
  if (!vencimento) redirect(`/processos/${processoId}?aba=tarefas`);
  try {
    await criarTarefa({
      processoId,
      tipoId: String(form.get("tipoId") || ""),
      titulo: String(form.get("titulo") || "").trim(),
      responsavelId: String(form.get("responsavelId") || usuario.id),
      vencimento,
      descricao: String(form.get("descricao") || "") || null,
    });
  } catch (erro) {
    unstable_rethrow(erro);
    if (!(erro instanceof AppError)) throw erro;
  }
  revalidatePath("/tarefas");
  const voltar = String(form.get("voltar") || "");
  redirect(voltar.startsWith("/tarefas") ? voltar : `/processos/${processoId}?aba=tarefas`);
}

export async function concluirTarefaAction(form: FormData) {
  await exigirUsuario();
  const id = String(form.get("id") || "");
  const tarefa = await prisma.tarefa.update({
    where: { id },
    data: { concluidaEm: new Date() },
  });
  revalidatePath("/tarefas");
  revalidatePath(`/processos/${tarefa.processoId}`);
}

export async function adicionarInventarioAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const catalogoId = String(form.get("catalogoId") || "");
  const nome = String(form.get("nome") || "");
  try {
    await adicionarItens(processoId, [
      {
        catalogoId: catalogoId || null,
        nome,
        volumeM3: form.get("volumeM3") ? Number(String(form.get("volumeM3")).replace(",", ".")) : null,
        comodo: String(form.get("comodo") || "SALA"),
        quantidade: Number(form.get("quantidade") || 1),
        fragil: form.get("fragil") === "on",
        desmontagem: form.get("desmontagem") === "on",
        embalagem: form.get("embalagem") === "on",
      },
    ]);
  } catch (erro) {
    unstable_rethrow(erro);
    if (!(erro instanceof AppError)) throw erro;
  }
  revalidatePath(`/processos/${processoId}`);
  redirect(`/processos/${processoId}?aba=inventario`);
}

export async function ajustarInventarioAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const delta = Number(form.get("delta"));
  try {
    await ajustarQuantidade(processoId, { catalogoId: String(form.get("catalogoId") || "") || null, itemId: String(form.get("itemId") || "") || null }, delta);
  } catch (erro) {
    unstable_rethrow(erro);
    if (!(erro instanceof AppError)) throw erro;
  }
  revalidatePath(`/processos/${processoId}`);
  redirect(`/processos/${processoId}?aba=inventario`);
}

export async function salvarValorInventarioAction(processoId: string, chave: string, texto: string) {
  await exigirUsuario();
  const bruto = texto.trim();
  const normalizado = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  const valor = bruto ? Number(normalizado) : null;
  await definirValorDeclarado(processoId, chave, valor != null && Number.isFinite(valor) ? valor : null);
  revalidatePath(`/processos/${processoId}`);
}

export async function atualizarVencimentoAction(form: FormData) {
  await exigirUsuario();
  const id = String(form.get("id") || "");
  const processoId = String(form.get("processoId") || "");
  const vencimento = instante(String(form.get("vencimento") || ""));
  if (vencimento) {
    try {
      await atualizarVencimentoTarefa(id, vencimento);
    } catch (erro) {
      unstable_rethrow(erro);
      if (!(erro instanceof AppError)) throw erro;
    }
  }
  revalidatePath("/tarefas");
  revalidatePath(`/processos/${processoId}`);
  const voltar = String(form.get("voltar") || "");
  redirect(voltar.startsWith("/tarefas") || voltar.startsWith("/processos/") ? voltar : `/processos/${processoId}?aba=resumo#tarefas-oportunidade`);
}

export async function removerInventarioAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  await removerItem(processoId, String(form.get("itemId") || ""));
  revalidatePath(`/processos/${processoId}`);
}

export async function atualizarCatalogoAction(form: FormData) {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return;
  const volume = Number(String(form.get("volumeM3") || "").replace(",", "."));
  if (!Number.isFinite(volume) || volume < 0) return;
  await prisma.itemCatalogo.update({
    where: { id: String(form.get("id") || "") },
    data: { volumeM3: volume, ativo: form.get("ativo") !== "off" },
  });
  revalidatePath("/inventario");
}

export async function atualizarRegraTarefaAction(form: FormData) {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return;
  const horas = Number(form.get("horasDepois"));
  await prisma.regraTarefa.update({
    where: { id: String(form.get("id") || "") },
    data: {
      ativa: form.get("ativa") === "on",
      horasDepois: Number.isFinite(horas) && horas >= 0 ? Math.round(horas) : 24,
      titulo: String(form.get("titulo") || "").trim() || "Tarefa",
    },
  });
  revalidatePath("/tarefas");
  revalidatePath("/etapas");
}

function texto(form: FormData, nome: string) {
  const valor = String(form.get(nome) || "").trim();
  return valor || null;
}

function numeroCampo(form: FormData, nome: string) {
  const bruto = String(form.get(nome) || "").trim();
  const valor = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  if (!valor) return null;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : null;
}

function atorDoFormulario(form: FormData, prefixo: string): AtorCte {
  return {
    nome: texto(form, `${prefixo}Nome`) || "",
    documento: texto(form, `${prefixo}Documento`),
    ie: texto(form, `${prefixo}Ie`),
    email: texto(form, `${prefixo}Email`),
    telefone: texto(form, `${prefixo}Telefone`),
    endereco: texto(form, `${prefixo}Endereco`),
    numero: texto(form, `${prefixo}Numero`),
    complemento: texto(form, `${prefixo}Complemento`),
    bairro: texto(form, `${prefixo}Bairro`),
    cep: texto(form, `${prefixo}Cep`),
    cidade: texto(form, `${prefixo}Cidade`),
    uf: texto(form, `${prefixo}Uf`),
  };
}

function destinoCte(processoId: string, secao: string, aviso?: string) {
  const url = `/processos/${processoId}?aba=cte&secao=${secao}`;
  return aviso ? `${url}&aviso=${encodeURIComponent(aviso)}` : url;
}

export async function salvarCteAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const cteId = String(form.get("cteId") || "");
  const secao = String(form.get("secao") || "identificacao");
  const atual = await prisma.cte.findUnique({ where: { id: cteId } });
  if (!atual) redirect(destinoCte(processoId, secao));
  const rascunho = lerRascunho(atual.rascunho);
  if (secao === "identificacao") {
    rascunho.finalidade = Number(form.get("finalidade") || 0);
    rascunho.tipoServico = Number(form.get("tipoServico") || 0);
    rascunho.modal = String(form.get("modal") || "01");
    rascunho.cfop = texto(form, "cfop");
    rascunho.naturezaOperacao = texto(form, "naturezaOperacao") || rascunho.naturezaOperacao;
    rascunho.indicadorTomador = Number(form.get("indicadorTomador") || 0);
    rascunho.contribuicaoTomador = Number(form.get("contribuicaoTomador") || 9);
    rascunho.inicioCidade = texto(form, "inicioCidade");
    rascunho.inicioUf = texto(form, "inicioUf");
    rascunho.fimCidade = texto(form, "fimCidade");
    rascunho.fimUf = texto(form, "fimUf");
    rascunho.valorServico = numeroCampo(form, "valorServico");
    rascunho.valorReceber = numeroCampo(form, "valorReceber");
  }
  if (secao === "atores") {
    rascunho.remetente = atorDoFormulario(form, "remetente");
    rascunho.destinatario = atorDoFormulario(form, "destinatario");
    const expedidor = atorDoFormulario(form, "expedidor");
    const recebedor = atorDoFormulario(form, "recebedor");
    const tomador = atorDoFormulario(form, "tomador");
    rascunho.expedidor = expedidor.nome ? expedidor : null;
    rascunho.recebedor = recebedor.nome ? recebedor : null;
    rascunho.tomador = tomador.nome ? tomador : null;
  }
  if (secao === "carga") {
    rascunho.produtoPredominante = texto(form, "produtoPredominante") || rascunho.produtoPredominante;
    rascunho.valorMercadoria = numeroCampo(form, "valorMercadoria");
    rascunho.caracteristicas = texto(form, "caracteristicas");
    rascunho.cubagemM3 = numeroCampo(form, "cubagemM3");
    rascunho.rntrc = texto(form, "rntrc");
  }
  if (secao === "documentos") {
    const chave = texto(form, "docChave");
    const numero = texto(form, "docNumero");
    rascunho.documentos = chave || numero ? [{ tipo: Number(form.get("docTipo") || 1), chave, numero }] : [];
    rascunho.observacoes = texto(form, "observacoes");
  }
  if (secao === "tributacao") {
    rascunho.situacaoIcms = String(form.get("situacaoIcms") || "00");
    rascunho.regime = texto(form, "regime");
    rascunho.reducaoBase = numeroCampo(form, "reducaoBase");
    rascunho.baseIcms = numeroCampo(form, "baseIcms");
    rascunho.aliquotaIcms = numeroCampo(form, "aliquotaIcms");
    rascunho.valorIcms = numeroCampo(form, "valorIcms");
    rascunho.creditoIcms = numeroCampo(form, "creditoIcms");
    rascunho.beneficioFiscal = texto(form, "beneficioFiscal");
    rascunho.partilhaIcms = form.get("partilhaIcms") === "on";
    rascunho.ibsSituacao = texto(form, "ibsSituacao");
    rascunho.ibsClassificacao = texto(form, "ibsClassificacao");
    rascunho.ibsBase = numeroCampo(form, "ibsBase");
    rascunho.ibsAliquotaEstadual = numeroCampo(form, "ibsAliquotaEstadual");
    rascunho.ibsValorEstadual = numeroCampo(form, "ibsValorEstadual");
    rascunho.ibsAliquotaMunicipal = numeroCampo(form, "ibsAliquotaMunicipal");
    rascunho.ibsValorMunicipal = numeroCampo(form, "ibsValorMunicipal");
    rascunho.cbsAliquota = numeroCampo(form, "cbsAliquota");
    rascunho.cbsValor = numeroCampo(form, "cbsValor");
  }
  if (secao === "rodoviario") {
    rascunho.rntrc = texto(form, "rntrc");
    rascunho.veiculo = texto(form, "veiculo");
    rascunho.motorista = texto(form, "motorista");
    rascunho.lacres = String(form.get("lacres") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  await atualizarRascunho(cteId, rascunho);
  revalidatePath(`/processos/${processoId}`);
  redirect(destinoCte(processoId, secao));
}

async function voltarComAviso(processoId: string, secao: string, executar: () => Promise<{ mensagemProvedor?: string | null }>) {
  try {
    const cte = await executar();
    revalidatePath(`/processos/${processoId}`);
    redirect(destinoCte(processoId, secao, cte.mensagemProvedor || undefined));
  } catch (erro) {
    unstable_rethrow(erro);
    const mensagem = erro instanceof AppError ? erro.message : "Não foi possível concluir a ação do CT-e.";
    redirect(destinoCte(processoId, secao, mensagem));
  }
}

export async function emitirCteAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  await voltarComAviso(processoId, "acoes", () => emitirCte(processoId));
}

export async function repreencherCteAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  try {
    await repreencherCte(processoId);
  } catch (erro) {
    unstable_rethrow(erro);
    const mensagem = erro instanceof AppError ? erro.message : "Não foi possível preencher o CT-e.";
    redirect(destinoCte(processoId, "identificacao", mensagem));
  }
  revalidatePath(`/processos/${processoId}`);
  redirect(destinoCte(processoId, "identificacao"));
}

export async function duplicarCteAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  await duplicarCte(String(form.get("cteId") || ""));
  revalidatePath(`/processos/${processoId}`);
  redirect(destinoCte(processoId, "acoes", "Rascunho duplicado. A cópia é o CT-e mais recente."));
}

export async function cancelarCteAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  await voltarComAviso(processoId, "acoes", () => cancelarCte(String(form.get("cteId") || ""), String(form.get("justificativa") || "")));
}

export async function corrigirCteAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  await voltarComAviso(processoId, "acoes", () =>
    corrigirCte(String(form.get("cteId") || ""), String(form.get("grupo") || ""), String(form.get("campo") || ""), String(form.get("valor") || "")),
  );
}

export async function garantirCte(processoId: string) {
  return obterOuPreencherCte(processoId);
}
