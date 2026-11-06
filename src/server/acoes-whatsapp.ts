"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { EstadoForm } from "@/lib/estado";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { enviarMensagem } from "@/server/whatsapp";
import { segredosWhatsapp } from "@/server/whatsapp-config";
import { solicitarSincronismo } from "@/server/whatsapp-signup";
import { atribuirConversa, vincularProcesso } from "@/server/whatsapp";
import { exigirUsuario } from "@/server/session";

function falha(erro: unknown, reserva: string): EstadoForm {
  unstable_rethrow(erro);
  if (erro instanceof AppError) return { erro: erro.message };
  console.error(erro);
  return { erro: reserva };
}

export async function enviarTextoWhatsapp(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("conversaId") ?? "");
  try {
    await exigirUsuario();
    const texto = String(form.get("texto") ?? "");
    await enviarMensagem(id, { texto });
    revalidatePath(`/whatsapp/${id}`);
    revalidatePath("/whatsapp");
    return { ok: "Mensagem enviada." };
  } catch (erro) {
    revalidatePath(`/whatsapp/${id}`);
    return falha(erro, "Não foi possível enviar a mensagem.");
  }
}

export async function enviarModeloWhatsapp(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("conversaId") ?? "");
  try {
    await exigirUsuario();
    const nome = String(form.get("modelo") ?? "").trim();
    const idioma = String(form.get("idioma") ?? "pt_BR").trim() || "pt_BR";
    const parametros = String(form.get("parametros") ?? "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!nome) throw new AppError("Informe o nome do modelo aprovado.", 400, "DADOS_INVALIDOS");
    await enviarMensagem(id, { modelo: { nome, idioma, parametros } });
    revalidatePath(`/whatsapp/${id}`);
    revalidatePath("/whatsapp");
    return { ok: "Modelo enviado." };
  } catch (erro) {
    revalidatePath(`/whatsapp/${id}`);
    return falha(erro, "Não foi possível enviar o modelo.");
  }
}

export async function atribuirWhatsapp(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("conversaId") ?? "");
  try {
    await exigirUsuario();
    const responsavelId = String(form.get("responsavelId") ?? "").trim();
    await atribuirConversa(id, responsavelId || null);
    revalidatePath(`/whatsapp/${id}`);
    return { ok: "Conversa atribuída." };
  } catch (erro) {
    return falha(erro, "Não foi possível atribuir a conversa.");
  }
}

export async function vincularWhatsapp(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("conversaId") ?? "");
  try {
    await exigirUsuario();
    const referencia = String(form.get("processo") ?? "").trim();
    await vincularProcesso(id, referencia || null);
    revalidatePath(`/whatsapp/${id}`);
    revalidatePath("/processos");
    return { ok: referencia ? "Conversa ligada ao processo." : "Vínculo removido." };
  } catch (erro) {
    return falha(erro, "Não foi possível ligar o processo.");
  }
}

export async function salvarConfigWhatsapp(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador altera a conexão com a Meta.", 403, "PROIBIDO");
    const segredos = await segredosWhatsapp();
    const data: {
      verifyToken?: string;
      appSecret?: string;
      accessToken?: string;
      wabaId?: string | null;
      appId?: string | null;
      embeddedSignupConfigId?: string | null;
      apiVersion?: string;
    } = {};
    const verifyToken = String(form.get("verifyToken") ?? "").trim();
    const appSecret = String(form.get("appSecret") ?? "").trim();
    const accessToken = String(form.get("accessToken") ?? "").trim();
    const wabaId = String(form.get("wabaId") ?? "").trim();
    const appId = String(form.get("appId") ?? "").trim();
    const embeddedSignupConfigId = String(form.get("embeddedSignupConfigId") ?? "").trim();
    const apiVersion = String(form.get("apiVersion") ?? "").trim();
    if (!segredos.verifyTokenNoAmbiente && verifyToken) data.verifyToken = verifyToken;
    if (!segredos.appSecretNoAmbiente && appSecret) data.appSecret = appSecret;
    if (!segredos.accessTokenNoAmbiente && accessToken) data.accessToken = accessToken;
    if (!process.env.WHATSAPP_WABA_ID?.trim()) data.wabaId = wabaId || null;
    if (!segredos.appIdNoAmbiente) data.appId = appId || null;
    if (!segredos.configIdNoAmbiente) data.embeddedSignupConfigId = embeddedSignupConfigId || null;
    if (!process.env.WHATSAPP_API_VERSION?.trim() && apiVersion) data.apiVersion = apiVersion;
    await prisma.configWhatsapp.upsert({ where: { id: "padrao" }, update: data, create: { id: "padrao", ...data } });
    revalidatePath("/whatsapp/ajustes");
    return { ok: "Configuração salva. Campos vazios mantêm o valor anterior." };
  } catch (erro) {
    return falha(erro, "Não foi possível salvar a configuração.");
  }
}

export async function salvarNumeroWhatsapp(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador cadastra números.", 403, "PROIBIDO");
    const nome = String(form.get("nome") ?? "").trim();
    const phoneNumberId = String(form.get("phoneNumberId") ?? "").trim();
    const numeroExibicao = String(form.get("numeroExibicao") ?? "").trim();
    const accessToken = String(form.get("accessToken") ?? "").trim();
    if (nome.length < 2 || !phoneNumberId || !numeroExibicao) {
      throw new AppError("Informe nome, phone number id e o número de exibição.", 400, "DADOS_INVALIDOS");
    }
    await prisma.numeroWhatsapp.upsert({
      where: { phoneNumberId },
      update: {
        nome,
        numeroExibicao,
        ativo: true,
        ...(accessToken ? { accessToken } : {}),
      },
      create: { nome, phoneNumberId, numeroExibicao, accessToken: accessToken || null },
    });
    revalidatePath("/whatsapp/ajustes");
    return { ok: "Número salvo." };
  } catch (erro) {
    return falha(erro, "Não foi possível salvar o número.");
  }
}

export async function sincronizarHistoricoWhatsapp(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("numeroId") ?? "");
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador pede o histórico.", 403, "PROIBIDO");
    await solicitarSincronismo(id);
    revalidatePath("/integracoes");
    revalidatePath("/whatsapp");
    return { ok: "Histórico pedido. As conversas antigas chegam pelo webhook." };
  } catch (erro) {
    return falha(erro, "Não foi possível pedir o histórico.");
  }
}

export async function alternarNumeroWhatsapp(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("numeroId") ?? "");
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador altera números.", 403, "PROIBIDO");
    const numero = await prisma.numeroWhatsapp.findUnique({ where: { id } });
    if (!numero) throw new AppError("Número não encontrado.", 404, "NAO_ENCONTRADO");
    await prisma.numeroWhatsapp.update({ where: { id }, data: { ativo: !numero.ativo } });
    revalidatePath("/integracoes");
    return { ok: numero.ativo ? "Número desativado." : "Número reativado." };
  } catch (erro) {
    return falha(erro, "Não foi possível atualizar o número.");
  }
}

