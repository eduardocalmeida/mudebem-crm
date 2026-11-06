"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { AppError } from "@/lib/errors";
import { definirDocumentoFiscal, emitirNfse, obterOuPreencherNfse, salvarCodigoServico, salvarNfse, cancelarNfse } from "@/server/nfse/nfse";
import type { RascunhoNfse } from "@/server/nfse/webmania";
import { exigirUsuario } from "@/server/session";

function texto(form: FormData, nome: string) {
  const valor = String(form.get(nome) || "").trim();
  return valor || null;
}

function decimal(form: FormData, nome: string) {
  const bruto = String(form.get(nome) || "").trim();
  if (!bruto) return null;
  const valor = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function destino(processoId: string, aviso?: string) {
  const url = `/processos/${processoId}?aba=fiscal`;
  redirect(aviso ? `${url}&aviso=${encodeURIComponent(aviso)}` : url);
}

export async function escolherDocumentoAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const escolha = String(form.get("documento") || "");
  await definirDocumentoFiscal(processoId, escolha === "NFSE" || escolha === "CTE" ? escolha : null);
  revalidatePath(`/processos/${processoId}`);
  destino(processoId);
}

export async function salvarNfseAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const id = String(form.get("id") || "");
  const rascunho: RascunhoNfse = {
    prestadorMunicipio: texto(form, "prestadorMunicipio"),
    prestadorUf: texto(form, "prestadorUf"),
    prestadorIbge: texto(form, "prestadorIbge"),
    tomadorNome: texto(form, "tomadorNome"),
    tomadorDocumento: texto(form, "tomadorDocumento"),
    tomadorEmail: texto(form, "tomadorEmail"),
    tomadorEndereco: texto(form, "tomadorEndereco"),
    tomadorNumero: texto(form, "tomadorNumero"),
    tomadorBairro: texto(form, "tomadorBairro"),
    tomadorCidade: texto(form, "tomadorCidade"),
    tomadorUf: texto(form, "tomadorUf"),
    tomadorCep: texto(form, "tomadorCep"),
    municipioPrestacao: texto(form, "municipioPrestacao"),
    discriminacao: texto(form, "discriminacao"),
    codigoServico: texto(form, "codigoServico"),
    cnae: texto(form, "cnae"),
    aliquotaIss: decimal(form, "aliquotaIss"),
    issRetido: form.get("issRetido") === "on",
    aliquotaPis: decimal(form, "aliquotaPis"),
    aliquotaCofins: decimal(form, "aliquotaCofins"),
    aliquotaCsll: decimal(form, "aliquotaCsll"),
    aliquotaIr: decimal(form, "aliquotaIr"),
    aliquotaInss: decimal(form, "aliquotaInss"),
    valorServicos: decimal(form, "valorServicos"),
    deducoes: decimal(form, "deducoes"),
    ibsSituacao: texto(form, "ibsSituacao"),
    ibsClassificacao: texto(form, "ibsClassificacao"),
  };
  try {
    await salvarNfse(id, rascunho);
  } catch (erro) {
    unstable_rethrow(erro);
    destino(processoId, erro instanceof AppError ? erro.message : "Não foi possível salvar a NFS-e.");
  }
  revalidatePath(`/processos/${processoId}`);
  destino(processoId);
}

export async function emitirNfseAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const nota = await obterOuPreencherNfse(processoId);
  try {
    const salva = await emitirNfse(nota.id);
    revalidatePath(`/processos/${processoId}`);
    destino(processoId, salva.mensagemProvedor || undefined);
  } catch (erro) {
    unstable_rethrow(erro);
    destino(processoId, erro instanceof AppError ? erro.message : "Não foi possível emitir a NFS-e.");
  }
}

export async function cancelarNfseAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  try {
    const salva = await cancelarNfse(String(form.get("id") || ""), Number(form.get("motivo") || 0));
    revalidatePath(`/processos/${processoId}`);
    destino(processoId, salva.mensagemProvedor || undefined);
  } catch (erro) {
    unstable_rethrow(erro);
    destino(processoId, erro instanceof AppError ? erro.message : "Não foi possível cancelar a NFS-e.");
  }
}

export async function salvarCodigoServicoAction(form: FormData) {
  const usuario = await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  if (usuario.papel !== "ADMIN") destino(processoId, "Só um administrador altera os códigos de serviço.");
  await salvarCodigoServico(String(form.get("codigoId") || ""), {
    descricao: texto(form, "descricao") || "Serviço",
    cnae: texto(form, "cnae"),
    aliquotaIss: decimal(form, "aliquotaIss"),
    padrao: form.get("padrao") === "on",
  });
  revalidatePath(`/processos/${processoId}`);
  destino(processoId);
}
