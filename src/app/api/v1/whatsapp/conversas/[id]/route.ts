import { NextResponse } from "next/server";
import { atorDaRequisicao, responderErro } from "@/lib/api";
import { obterConversa } from "@/server/whatsapp";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(req: Request, contexto: Contexto) {
  try {
    await atorDaRequisicao(req);
    const { id } = await contexto.params;
    const marcarLida = new URL(req.url).searchParams.get("marcarLida") !== "nao";
    return NextResponse.json(await obterConversa(id, marcarLida));
  } catch (erro) {
    return responderErro(erro);
  }
}
