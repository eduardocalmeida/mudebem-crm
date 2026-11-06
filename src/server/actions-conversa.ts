"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CanalConversa } from "@prisma/client";
import { exigirUsuario } from "@/server/session";
import { abrirConversaDoProcesso, definirStatusConversa, registrarMensagem } from "@/server/conversas";

function canalDe(valor: string): CanalConversa {
  if (valor === "WHATSAPP" || valor === "EMAIL" || valor === "TELEFONE" || valor === "OUTRO") return valor;
  return "OUTRO";
}

function destino(form: FormData, conversaId: string) {
  const processoId = String(form.get("processoId") || "");
  if (processoId) return `/processos/${processoId}`;
  return `/comunicacao/${conversaId}`;
}

export async function registrarMensagemAction(form: FormData) {
  const usuario = await exigirUsuario();
  const conversaId = String(form.get("conversaId") || "");
  const conteudo = String(form.get("conteudo") || "");
  const direcao = form.get("direcao") === "ENTRADA" ? "ENTRADA" : "SAIDA";
  await registrarMensagem({
    conversaId,
    conteudo,
    canal: canalDe(String(form.get("canal") || "OUTRO")),
    direcao,
    remetente: direcao === "SAIDA" ? usuario.nome : String(form.get("remetente") || "") || null,
  });
  revalidatePath("/whatsapp");
  revalidatePath(`/comunicacao/${conversaId}`);
  redirect(destino(form, conversaId));
}

export async function abrirConversaAction(form: FormData) {
  const usuario = await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  await abrirConversaDoProcesso(processoId, usuario.id);
  revalidatePath(`/processos/${processoId}`);
  redirect(`/processos/${processoId}`);
}

export async function statusConversaAction(form: FormData) {
  await exigirUsuario();
  const conversaId = String(form.get("conversaId") || "");
  const status = String(form.get("status") || "ABERTA");
  if (status === "ABERTA" || status === "EM_ESPERA" || status === "FECHADA") {
    await definirStatusConversa(conversaId, status);
  }
  revalidatePath("/whatsapp");
  revalidatePath(`/comunicacao/${conversaId}`);
  redirect(destino(form, conversaId));
}
