import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { baixarMidia } from "@/server/whatsapp";
import { usuarioAtual } from "@/server/session";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_req: Request, contexto: Contexto) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autorizado.", codigo: "NAO_AUTORIZADO" }, { status: 401 });
  try {
    const { id } = await contexto.params;
    const midia = await baixarMidia(id);
    return new NextResponse(new Uint8Array(midia.bytes), {
      headers: {
        "Content-Type": midia.mime,
        "Content-Disposition": `inline; filename="${midia.nome.replace(/[\r\n"]/g, "_")}"`,
      },
    });
  } catch (erro) {
    if (erro instanceof AppError) {
      return NextResponse.json({ erro: erro.message, codigo: erro.codigo }, { status: erro.status });
    }
    console.error(erro);
    return NextResponse.json({ erro: "Erro interno.", codigo: "ERRO_INTERNO" }, { status: 500 });
  }
}
