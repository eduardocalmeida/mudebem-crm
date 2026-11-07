import { NextResponse } from "next/server";
import { atorDaRequisicao, lerJson, responderErro } from "@/lib/api";
import { erroZod } from "@/lib/errors";
import { esquemaPatchCliente } from "@/lib/schemas";
import { atualizarCliente, obterCliente } from "@/server/clientes";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(req: Request, contexto: Contexto) {
  try {
    await atorDaRequisicao(req);
    const { id } = await contexto.params;
    return NextResponse.json(await obterCliente(id));
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function PATCH(req: Request, contexto: Contexto) {
  try {
    const ator = await atorDaRequisicao(req);
    const { id } = await contexto.params;
    const resultado = esquemaPatchCliente.safeParse(await lerJson(req));
    if (!resultado.success) throw erroZod(resultado.error);
    return NextResponse.json(await atualizarCliente(ator, id, resultado.data));
  } catch (erro) {
    return responderErro(erro);
  }
}
