import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hashChave } from "@/lib/api-key";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { Ator } from "@/lib/ator";

export async function atorDaRequisicao(req: Request): Promise<Ator> {
  const autorizacao = req.headers.get("authorization") ?? "";
  const bearer = autorizacao.toLowerCase().startsWith("bearer ") ? autorizacao.slice(7).trim() : "";
  const chave = bearer || req.headers.get("x-api-key")?.trim() || "";
  if (!chave) {
    throw new AppError(
      "Informe a chave de API no cabeçalho Authorization: Bearer ou X-API-Key.",
      401,
      "NAO_AUTORIZADO",
    );
  }

  const registro = await prisma.chaveApi.findUnique({ where: { hash: hashChave(chave) } });
  if (!registro || registro.revogadaEm) {
    throw new AppError("Chave de API inválida ou revogada.", 401, "NAO_AUTORIZADO");
  }

  await prisma.chaveApi.update({ where: { id: registro.id }, data: { ultimoUsoEm: new Date() } });
  return { tipo: "api", chaveId: registro.id, nome: registro.nome };
}

export async function lerJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("JSON inválido.", 400, "DADOS_INVALIDOS");
  }
}

export function responderErro(erro: unknown) {
  if (erro instanceof AppError) {
    return NextResponse.json({ erro: erro.message, codigo: erro.codigo }, { status: erro.status });
  }
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
    return NextResponse.json(
      { erro: "Já existe um registro com esse valor único.", codigo: "CONFLITO" },
      { status: 409 },
    );
  }
  console.error(erro);
  return NextResponse.json({ erro: "Erro interno.", codigo: "ERRO_INTERNO" }, { status: 500 });
}
