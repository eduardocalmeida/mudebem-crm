import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function statusInterno(valor: string) {
  const texto = valor.toLowerCase();
  if (texto === "aprovado") return "AUTORIZADO";
  if (texto === "encerrado") return "ENCERRADO";
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
    mdfe?: unknown;
    status?: unknown;
    motivo?: unknown;
    xml?: unknown;
    damdfe?: unknown;
  } | null;
  const chave = typeof corpo?.chave === "string" ? corpo.chave : "";
  const uuid = typeof corpo?.uuid === "string" ? corpo.uuid : "";
  if (!chave && !uuid) {
    return NextResponse.json({ erro: "Informe a chave ou o uuid.", codigo: "DADOS_INVALIDOS" }, { status: 400 });
  }
  const manifesto = await prisma.mdfe.findFirst({
    where: { OR: [...(chave ? [{ chave }] : []), ...(uuid ? [{ uuidProvedor: uuid }] : [])] },
  });
  if (!manifesto) return NextResponse.json({ recebido: true, vinculado: false });
  await prisma.mdfe.update({
    where: { id: manifesto.id },
    data: {
      status: statusInterno(String(corpo?.status || "")),
      chave: chave || manifesto.chave,
      uuidProvedor: uuid || manifesto.uuidProvedor,
      numero: corpo?.mdfe != null ? String(corpo.mdfe) : manifesto.numero,
      serie: corpo?.serie != null ? String(corpo.serie) : manifesto.serie,
      xmlUrl: typeof corpo?.xml === "string" ? corpo.xml : manifesto.xmlUrl,
      damdfeUrl: typeof corpo?.damdfe === "string" ? corpo.damdfe : manifesto.damdfeUrl,
      mensagemProvedor: typeof corpo?.motivo === "string" ? corpo.motivo : manifesto.mensagemProvedor,
    },
  });
  return NextResponse.json({ recebido: true, vinculado: true });
}
