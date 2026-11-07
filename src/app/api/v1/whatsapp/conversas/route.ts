import { NextResponse } from "next/server";
import { atorDaRequisicao, responderErro } from "@/lib/api";
import { listarConversas } from "@/server/whatsapp";

export async function GET(req: Request) {
  try {
    await atorDaRequisicao(req);
    const params = new URL(req.url).searchParams;
    const naoLidas = params.get("naoLidas") === "sim" || params.get("naoLidas") === "true";
    const numeroId = params.get("numeroId")?.trim() || undefined;
    const dados = await listarConversas({ naoLidas, numeroId });
    return NextResponse.json({ dados, total: dados.length });
  } catch (erro) {
    return responderErro(erro);
  }
}
