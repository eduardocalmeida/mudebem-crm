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
    status?: unknown;
    motivo?: unknown;
    numero?: unknown;
    codigo_verificacao?: unknown;
    serie_rps?: unknown;
    numero_rps?: unknown;
    xml?: unknown;
    pdf_nfse?: unknown;
  } | null;
  const uuid = typeof corpo?.uuid === "string" ? corpo.uuid : "";
  if (!uuid) return NextResponse.json({ erro: "Informe o uuid.", codigo: "DADOS_INVALIDOS" }, { status: 400 });
  const nota = await prisma.nfse.findFirst({ where: { uuidProvedor: uuid } });
  if (!nota) return NextResponse.json({ recebido: true, vinculado: false });
  await prisma.nfse.update({
    where: { id: nota.id },
    data: {
      status: statusInterno(String(corpo?.status || "")),
      numero: corpo?.numero != null ? String(corpo.numero) : nota.numero,
      codigoVerificacao: typeof corpo?.codigo_verificacao === "string" ? corpo.codigo_verificacao : nota.codigoVerificacao,
      serieRps: corpo?.serie_rps != null ? String(corpo.serie_rps) : nota.serieRps,
      numeroRps: corpo?.numero_rps != null ? String(corpo.numero_rps) : nota.numeroRps,
      xmlUrl: typeof corpo?.xml === "string" ? corpo.xml : nota.xmlUrl,
      pdfUrl: typeof corpo?.pdf_nfse === "string" ? corpo.pdf_nfse : nota.pdfUrl,
      mensagemProvedor: typeof corpo?.motivo === "string" ? corpo.motivo : nota.mensagemProvedor,
    },
  });
  return NextResponse.json({ recebido: true, vinculado: true });
}
