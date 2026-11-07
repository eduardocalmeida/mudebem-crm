import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { formatarWaId } from "@/lib/whatsapp";
import { segredosWhatsapp, tokenDoNumero } from "@/server/whatsapp-config";

const JANELA_HISTORICO_MS = 24 * 60 * 60 * 1000;

type FetchComo = typeof fetch;

export type ResultadoCadastro = {
  numeroId: string;
  phoneNumberId: string;
  coexistencia: boolean;
  historico: { history: string; contatos: string } | null;
};

async function lerJson(resposta: Response) {
  return (await resposta.json().catch(() => null)) as {
    access_token?: string;
    display_phone_number?: string;
    verified_name?: string;
    error?: { message?: string };
    success?: boolean;
  } | null;
}

export function historicoAindaDisponivel(ativadoEm: Date | null, agora = new Date()) {
  if (!ativadoEm) return false;
  return agora.getTime() - ativadoEm.getTime() < JANELA_HISTORICO_MS;
}

export async function solicitarSincronismo(
  numeroId: string,
  opcoes?: { fetchImpl?: FetchComo; agora?: Date },
) {
  const numero = await prisma.numeroWhatsapp.findUnique({ where: { id: numeroId } });
  if (!numero) throw new AppError("Número não encontrado.", 404, "NAO_ENCONTRADO");
  if (!numero.coexistencia) {
    throw new AppError("O histórico do aplicativo só existe para um número em coexistência.", 400, "DADOS_INVALIDOS");
  }
  const agora = opcoes?.agora ?? new Date();
  if (!historicoAindaDisponivel(numero.coexistenciaAtivadoEm, agora)) {
    await prisma.numeroWhatsapp.update({
      where: { id: numero.id },
      data: { historicoStatus: "expirado", historicoErro: "A Meta só aceita o pedido nas 24 horas seguintes ao cadastro." },
    });
    throw new AppError(
      "O histórico só pode ser pedido nas 24 horas seguintes ao Embedded Signup. Essa janela já passou.",
      409,
      "JANELA_HISTORICO",
    );
  }
  if (numero.historicoStatus === "concluido" || numero.historicoStatus === "recusado") {
    throw new AppError("A sincronização de histórico já foi concluída ou recusada. A Meta só permite uma vez.", 409, "HISTORICO_JA_PEDIDO");
  }

  const segredos = await segredosWhatsapp();
  const token = tokenDoNumero(numero, segredos);
  if (!token) throw new AppError("Não há token de acesso para este número.", 400, "DADOS_INVALIDOS");
  const buscar = opcoes?.fetchImpl ?? fetch;
  const url = `https://graph.facebook.com/${segredos.apiVersion}/${numero.phoneNumberId}/smb_app_data`;

  async function pedir(syncType: "history" | "smb_app_state_sync") {
    const resposta = await buscar(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", sync_type: syncType }),
    });
    const json = await lerJson(resposta);
    if (!resposta.ok) {
      throw new AppError(json?.error?.message || `A Meta recusou o sincronismo ${syncType}.`, 502, "FALHA_ENVIO");
    }
    return "aceito";
  }

  try {
    const history = await pedir("history");
    let contatos = "nao-solicitado";
    try {
      contatos = await pedir("smb_app_state_sync");
    } catch (erro) {
      contatos = erro instanceof AppError ? erro.message : "Falha ao sincronizar contatos.";
    }
    await prisma.numeroWhatsapp.update({
      where: { id: numero.id },
      data: {
        historicoSolicitadoEm: agora,
        historicoStatus: "sincronizando",
        historicoErro: contatos === "aceito" ? null : contatos,
      },
    });
    return { history, contatos };
  } catch (erro) {
    const mensagem = erro instanceof AppError ? erro.message : "Falha ao pedir o histórico.";
    await prisma.numeroWhatsapp.update({
      where: { id: numero.id },
      data: { historicoStatus: "erro", historicoErro: mensagem },
    });
    throw erro;
  }
}

export async function concluirEmbeddedSignup(
  entrada: {
    code: string;
    phoneNumberId: string;
    wabaId: string;
    coexistencia: boolean;
  },
  opcoes?: { fetchImpl?: FetchComo; agora?: Date },
): Promise<ResultadoCadastro> {
  const segredos = await segredosWhatsapp();
  if (!segredos.appId || !segredos.appSecret) {
    throw new AppError("Configure o app id e o app secret da Meta antes do cadastro incorporado.", 400, "DADOS_INVALIDOS");
  }
  const buscar = opcoes?.fetchImpl ?? fetch;
  const agora = opcoes?.agora ?? new Date();
  const troca = new URL(`https://graph.facebook.com/${segredos.apiVersion}/oauth/access_token`);
  troca.searchParams.set("client_id", segredos.appId);
  troca.searchParams.set("client_secret", segredos.appSecret);
  troca.searchParams.set("code", entrada.code);
  const tokenResposta = await buscar(troca);
  const tokenJson = await lerJson(tokenResposta);
  if (!tokenResposta.ok || !tokenJson?.access_token) {
    throw new AppError(tokenJson?.error?.message || "A Meta não trocou o código por um token.", 502, "FALHA_ENVIO");
  }
  const token = tokenJson.access_token;

  const detalhesResposta = await buscar(
    `https://graph.facebook.com/${segredos.apiVersion}/${entrada.phoneNumberId}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const detalhes = await lerJson(detalhesResposta);
  const exibicao = detalhes?.display_phone_number || formatarWaId(entrada.phoneNumberId);
  const nome = detalhes?.verified_name || (entrada.coexistencia ? "WhatsApp Business" : "WhatsApp");

  const inscricao = await buscar(`https://graph.facebook.com/${segredos.apiVersion}/${entrada.wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!inscricao.ok) {
    const erro = await lerJson(inscricao);
    throw new AppError(erro?.error?.message || "Não foi possível inscrever o app nos webhooks da WABA.", 502, "FALHA_ENVIO");
  }

  const numero = await prisma.numeroWhatsapp.upsert({
    where: { phoneNumberId: entrada.phoneNumberId },
    update: {
      nome,
      numeroExibicao: exibicao,
      accessToken: token,
      wabaId: entrada.wabaId,
      ativo: true,
      coexistencia: entrada.coexistencia,
      coexistenciaAtivadoEm: entrada.coexistencia ? agora : null,
      historicoStatus: entrada.coexistencia ? "pendente" : null,
      historicoErro: null,
    },
    create: {
      nome,
      phoneNumberId: entrada.phoneNumberId,
      numeroExibicao: exibicao,
      accessToken: token,
      wabaId: entrada.wabaId,
      coexistencia: entrada.coexistencia,
      coexistenciaAtivadoEm: entrada.coexistencia ? agora : null,
      historicoStatus: entrada.coexistencia ? "pendente" : null,
    },
  });

  if (!process.env.WHATSAPP_WABA_ID?.trim() || !process.env.WHATSAPP_ACCESS_TOKEN?.trim()) {
    await prisma.configWhatsapp.upsert({
      where: { id: "padrao" },
      update: {
        ...(process.env.WHATSAPP_WABA_ID?.trim() ? {} : { wabaId: entrada.wabaId }),
        ...(process.env.WHATSAPP_ACCESS_TOKEN?.trim() ? {} : { accessToken: token }),
      },
      create: { id: "padrao", wabaId: entrada.wabaId, accessToken: token },
    });
  }

  let historico: ResultadoCadastro["historico"] = null;
  if (entrada.coexistencia) {
    historico = await solicitarSincronismo(numero.id, { fetchImpl: buscar, agora });
  }

  return { numeroId: numero.id, phoneNumberId: numero.phoneNumberId, coexistencia: entrada.coexistencia, historico };
}
