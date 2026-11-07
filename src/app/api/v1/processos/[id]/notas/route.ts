import { NextResponse } from "next/server";
import { atorDaRequisicao, lerJson, responderErro } from "@/lib/api";
import { erroZod } from "@/lib/errors";
import { esquemaNota } from "@/lib/schemas";
import { adicionarNota } from "@/server/processos";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(req: Request, contexto: Contexto) {
  try {
    const ator = await atorDaRequisicao(req);
    const { id } = await contexto.params;
    const resultado = esquemaNota.safeParse(await lerJson(req));
    if (!resultado.success) throw erroZod(resultado.error);
    const resposta = await adicionarNota(ator, id, resultado.data.texto);
    return NextResponse.json(resposta, { status: 201 });
  } catch (erro) {
    return responderErro(erro);
  }
}
