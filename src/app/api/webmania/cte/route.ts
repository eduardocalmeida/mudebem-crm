import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function statusInterno(valor: string) {
  const texto = valor.toLowerCase();
  if (texto === "aprovado") return "AUTORIZADO";
  if (texto === "cancelado") return "CANCELADO";
  if (texto.includes("rejeit") || texto === "reprovado") return "REJEITADO";
  return "PROCESSANDO";
}

export async function POST(req: Request) {
  const esperado = process.env.WEBMANIA_WEBHOOK_TOKEN?.trim();
  const recebido = new URL(req.url).searchParams.get("token") || req.headers.get("x-webhook-token");
  if (!esperado || recebido !== esperado) {
    return NextResponse.json({ erro: "Webhook não autorizado.", codigo: "NAO_AUTORIZADO" }, { status: 401 });
  }
  const corpo = (await req.json().catch(() => null)) as {
    uuid?: unknown;
    chave?: unknown;
    serie?: unknown;
    numero?: unknown;
    status?: unknown;
    motivo?: unknown;
    xml?: unknown;
    dacte?: unknown;
  } | null;
  const chave = typeof corpo?.chave === "string" ? corpo.chave : "";
  const uuid = typeof corpo?.uuid === "string" ? corpo.uuid : "";
  if (!chave && !uuid) {
    return NextResponse.json({ erro: "Informe a chave ou o uuid.", codigo: "DADOS_INVALIDOS" }, { status: 400 });
  }
  const cte = await prisma.cte.findFirst({
    where: { OR: [...(chave ? [{ chave }] : []), ...(uuid ? [{ uuidProvedor: uuid }] : [])] },
  });
  if (!cte) return NextResponse.json({ recebido: true, vinculado: false });
  await prisma.cte.update({
    where: { id: cte.id },
    data: {
      status: statusInterno(String(corpo?.status || "")),
      chave: chave || cte.chave,
      uuidProvedor: uuid || cte.uuidProvedor,
      numero: corpo?.numero != null ? String(corpo.numero) : cte.numero,
      serie: corpo?.serie != null ? String(corpo.serie) : cte.serie,
      xmlUrl: typeof corpo?.xml === "string" ? corpo.xml : cte.xmlUrl,
      dacteUrl: typeof corpo?.dacte === "string" ? corpo.dacte : cte.dacteUrl,
      mensagemProvedor: typeof corpo?.motivo === "string" ? corpo.motivo : cte.mensagemProvedor,
      provedor: "webmania",
    },
  });
  return NextResponse.json({ recebido: true, vinculado: true });
}
