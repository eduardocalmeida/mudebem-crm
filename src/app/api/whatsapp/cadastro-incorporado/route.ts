import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, erroZod } from "@/lib/errors";
import { concluirEmbeddedSignup } from "@/server/whatsapp-signup";
import { usuarioAtual } from "@/server/session";

const esquema = z
  .object({
    code: z.string().trim().min(4),
    phoneNumberId: z.string().trim().min(4),
    wabaId: z.string().trim().min(4),
    coexistencia: z.boolean(),
  })
  .strict();

export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Não autorizado.", codigo: "NAO_AUTORIZADO" }, { status: 401 });
  if (usuario.papel !== "ADMIN") return NextResponse.json({ erro: "Só um administrador conecta números.", codigo: "PROIBIDO" }, { status: 403 });
  try {
    const resultado = esquema.safeParse(await req.json());
    if (!resultado.success) throw erroZod(resultado.error);
    const cadastro = await concluirEmbeddedSignup(resultado.data);
    return NextResponse.json(cadastro);
  } catch (erro) {
    if (erro instanceof AppError) {
      return NextResponse.json({ erro: erro.message, codigo: erro.codigo }, { status: erro.status });
    }
    console.error(erro);
    return NextResponse.json({ erro: "Erro interno.", codigo: "ERRO_INTERNO" }, { status: 500 });
  }
}
