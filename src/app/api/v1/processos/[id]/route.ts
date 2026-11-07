import { NextResponse } from "next/server";
import { atorDaRequisicao, lerJson, responderErro } from "@/lib/api";
import { erroZod } from "@/lib/errors";
import { esquemaPatchProcesso } from "@/lib/schemas";
import { atualizarProcesso, obterProcesso } from "@/server/processos";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(req: Request, contexto: Contexto) {
  try {
    await atorDaRequisicao(req);
    const { id } = await contexto.params;
    return NextResponse.json(await obterProcesso(id, true));
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function PATCH(req: Request, contexto: Contexto) {
  try {
    const ator = await atorDaRequisicao(req);
    const { id } = await contexto.params;
    const resultado = esquemaPatchProcesso.safeParse(await lerJson(req));
    if (!resultado.success) throw erroZod(resultado.error);
    return NextResponse.json(await atualizarProcesso(ator, id, resultado.data));
  } catch (erro) {
    return responderErro(erro);
  }
}
