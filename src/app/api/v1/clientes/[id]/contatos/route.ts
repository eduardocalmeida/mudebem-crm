import { NextResponse } from "next/server";
import { atorDaRequisicao, lerJson, responderErro } from "@/lib/api";
import { erroZod } from "@/lib/errors";
import { esquemaContato } from "@/lib/schemas";
import { criarContato } from "@/server/clientes";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(req: Request, contexto: Contexto) {
  try {
    const ator = await atorDaRequisicao(req);
    const { id } = await contexto.params;
    const resultado = esquemaContato.safeParse(await lerJson(req));
    if (!resultado.success) throw erroZod(resultado.error);
    const contato = await criarContato(ator, id, resultado.data);
    return NextResponse.json(contato, { status: 201 });
  } catch (erro) {
    return responderErro(erro);
  }
}
