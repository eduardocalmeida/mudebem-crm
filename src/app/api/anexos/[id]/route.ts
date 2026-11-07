import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/server/session";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_req: Request, contexto: Contexto) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autorizado.", codigo: "NAO_AUTORIZADO" }, { status: 401 });
  const { id } = await contexto.params;
  const anexo = await prisma.anexo.findUnique({ where: { id } });
  if (!anexo) return NextResponse.json({ erro: "Anexo não encontrado.", codigo: "NAO_ENCONTRADO" }, { status: 404 });
  const nome = anexo.nomeArquivo.replace(/[\r\n"]/g, "_");
  return new NextResponse(new Uint8Array(anexo.conteudo), {
    headers: {
      "Content-Type": anexo.tipoMime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Content-Length": String(anexo.tamanho),
    },
  });
}
