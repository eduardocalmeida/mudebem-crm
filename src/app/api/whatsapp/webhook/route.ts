import { NextResponse } from "next/server";
import { assinaturaValida } from "@/lib/whatsapp";
import { processarWebhook } from "@/server/whatsapp";
import { segredosWhatsapp } from "@/server/whatsapp-config";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const modo = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const desafio = url.searchParams.get("hub.challenge");
  const segredos = await segredosWhatsapp();
  if (modo === "subscribe" && token && segredos.verifyToken && token === segredos.verifyToken && desafio) {
    return new NextResponse(desafio, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const corpo = await req.text();
  const segredos = await segredosWhatsapp();
  if (!segredos.appSecret || !assinaturaValida(corpo, req.headers.get("x-hub-signature-256"), segredos.appSecret)) {
    return NextResponse.json({ erro: "Assinatura inválida.", codigo: "ASSINATURA_INVALIDA" }, { status: 403 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: "JSON inválido.", codigo: "DADOS_INVALIDOS" }, { status: 400 });
  }
  await processarWebhook(payload as Parameters<typeof processarWebhook>[0]);
  return NextResponse.json({ ok: true });
}
