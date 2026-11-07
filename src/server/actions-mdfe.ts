"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { AppError } from "@/lib/errors";
import { cancelarMdfe, criarMdfeDoProcesso, emitirMdfe, encerrarMdfe, salvarMdfe } from "@/server/mdfe/mdfe";
import { exigirUsuario } from "@/server/session";

function texto(form: FormData, nome: string) {
  const valor = String(form.get(nome) || "").trim();
  return valor || null;
}

function inteiro(form: FormData, nome: string) {
  const valor = String(form.get(nome) || "").trim().replace(/\./g, "").replace(",", ".");
  if (!valor) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.round(numero) : null;
}

function decimal(form: FormData, nome: string) {
  const bruto = String(form.get(nome) || "").trim();
  if (!bruto) return null;
  const valor = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function voltar(id: string, aviso?: string) {
  const url = `/mdfe/${id}`;
  redirect(aviso ? `${url}?aviso=${encodeURIComponent(aviso)}` : url);
}

export async function criarMdfeAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const cteIds = form.getAll("cteId").map(String).filter(Boolean);
  try {
    const mdfe = await criarMdfeDoProcesso(processoId, cteIds);
    revalidatePath("/mdfe");
    redirect(`/mdfe/${mdfe.id}`);
  } catch (erro) {
    unstable_rethrow(erro);
    const mensagem = erro instanceof AppError ? erro.message : "Não foi possível abrir o MDF-e.";
    redirect(`/processos/${processoId}?aba=cte&aviso=${encodeURIComponent(mensagem)}`);
  }
}

export async function salvarMdfeAction(form: FormData) {
  await exigirUsuario();
  const id = String(form.get("id") || "");
  try {
    await salvarMdfe(id, {
      ufInicio: texto(form, "ufInicio"),
      ufFim: texto(form, "ufFim"),
      percurso: texto(form, "percurso"),
      municipioCarregamento: texto(form, "municipioCarregamento"),
      municipioDescarregamento: texto(form, "municipioDescarregamento"),
      placa: texto(form, "placa"),
      renavam: texto(form, "renavam"),
      taraKg: inteiro(form, "taraKg"),
      capacidadeKg: inteiro(form, "capacidadeKg"),
      capacidadeM3: inteiro(form, "capacidadeM3"),
      condutorNome: texto(form, "condutorNome"),
      condutorCpf: texto(form, "condutorCpf"),
      rntrc: texto(form, "rntrc"),
      seguradoraNome: texto(form, "seguradoraNome"),
      seguradoraCnpj: texto(form, "seguradoraCnpj"),
      apolice: texto(form, "apolice"),
      averbacao: texto(form, "averbacao"),
      valorCarga: decimal(form, "valorCarga"),
      pesoBruto: decimal(form, "pesoBruto"),
      cteIds: form.getAll("cteId").map(String).filter(Boolean),
    });
  } catch (erro) {
    unstable_rethrow(erro);
    const mensagem = erro instanceof AppError ? erro.message : "Não foi possível salvar o MDF-e.";
    voltar(id, mensagem);
  }
  revalidatePath(`/mdfe/${id}`);
  voltar(id);
}

async function acao(id: string, executar: () => Promise<{ mensagemProvedor?: string | null }>) {
  try {
    const mdfe = await executar();
    revalidatePath(`/mdfe/${id}`);
    voltar(id, mdfe.mensagemProvedor || undefined);
  } catch (erro) {
    unstable_rethrow(erro);
    const mensagem = erro instanceof AppError ? erro.message : "Não foi possível concluir a ação do MDF-e.";
    voltar(id, mensagem);
  }
}

export async function emitirMdfeAction(form: FormData) {
  await exigirUsuario();
  const id = String(form.get("id") || "");
  await acao(id, () => emitirMdfe(id));
}

export async function encerrarMdfeAction(form: FormData) {
  await exigirUsuario();
  const id = String(form.get("id") || "");
  await acao(id, () => encerrarMdfe(id));
}

export async function cancelarMdfeAction(form: FormData) {
  await exigirUsuario();
  const id = String(form.get("id") || "");
  await acao(id, () => cancelarMdfe(id, String(form.get("justificativa") || "")));
}
