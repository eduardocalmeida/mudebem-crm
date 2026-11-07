"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { decidirSolicitacao, entrarComToken, enviarSolicitacao, pedirLinkPortal } from "@/server/portal/portal";
import type { EntradaItem } from "@/server/inventario";
import { exigirUsuario } from "@/server/session";

export async function pedirLinkAction(form: FormData) {
  const slug = String(form.get("slug") || "");
  try {
    const resultado = await pedirLinkPortal(slug, String(form.get("email") || ""));
    const aviso = resultado.link ? `&dev=${encodeURIComponent(resultado.link)}` : "";
    redirect(`/p/${slug}?enviado=1${aviso}`);
  } catch (erro) {
    unstable_rethrow(erro);
    const mensagem = erro instanceof AppError ? erro.message : "Não foi possível enviar o link.";
    redirect(`/p/${slug}?erro=${encodeURIComponent(mensagem)}`);
  }
}

export async function entrarPortalAction(form: FormData) {
  const slug = String(form.get("slug") || "");
  try {
    const destino = await entrarComToken(slug, String(form.get("token") || ""));
    redirect(destino);
  } catch (erro) {
    unstable_rethrow(erro);
    redirect(`/p/${slug}?erro=${encodeURIComponent(erro instanceof AppError ? erro.message : "Link inválido.")}`);
  }
}

export async function enviarSolicitacaoAction(entrada: {
  slug: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  unidadeId: string;
  dataPrevista: string;
  origemEndereco: string;
  origemCep: string;
  origemCidade: string;
  origemUf: string;
  destinoEndereco: string;
  destinoCep: string;
  destinoCidade: string;
  destinoUf: string;
  distanciaKm: number;
  valorDeclarado: number;
  itens: EntradaItem[];
}) {
  try {
    const criado = await enviarSolicitacao(entrada);
    return { protocolo: criado.protocolo, semFaixa: criado.preco.semFaixa, total: criado.preco.semFaixa ? null : criado.preco.total.toFixed(2) };
  } catch (erro) {
    if (erro instanceof AppError) return { erro: erro.message };
    throw erro;
  }
}

export async function decidirSolicitacaoAction(form: FormData) {
  const slug = String(form.get("slug") || "");
  try {
    await decidirSolicitacao(String(form.get("id") || ""), form.get("decisao") === "RECUSADA" ? "RECUSADA" : "APROVADA", String(form.get("motivo") || ""));
  } catch (erro) {
    unstable_rethrow(erro);
    redirect(`/p/${slug}/gestor?erro=${encodeURIComponent(erro instanceof AppError ? erro.message : "Falha na decisão.")}`);
  }
  revalidatePath(`/p/${slug}/gestor`);
  redirect(`/p/${slug}/gestor`);
}

export async function importarFaixasAction(form: FormData) {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return;
  const contratoId = String(form.get("contratoId") || "");
  const linhas = String(form.get("csv") || "").split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
  const dados = linhas
    .filter((linha) => !linha.toLowerCase().startsWith("volume"))
    .map((linha) => linha.split(/[;,]/).map((parte) => parte.trim()))
    .filter((partes) => partes.length >= 5)
    .map(([volumeMin, volumeMax, kmMin, kmMax, precoPorKm]) => ({
      contratoId,
      volumeMin: Number(volumeMin.replace(",", ".")),
      volumeMax: Number(volumeMax.replace(",", ".")),
      kmMin: Number(kmMin.replace(",", ".")),
      kmMax: Number(kmMax.replace(",", ".")),
      precoPorKm: Number(precoPorKm.replace(",", ".")),
    }));
  if (form.get("substituir") === "on") await prisma.faixaPreco.deleteMany({ where: { contratoId } });
  if (dados.length > 0) await prisma.faixaPreco.createMany({ data: dados });
  revalidatePath("/contratos");
  redirect("/contratos");
}
