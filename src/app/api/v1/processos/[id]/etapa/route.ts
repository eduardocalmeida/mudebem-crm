import { NextResponse } from "next/server";
import { atorDaRequisicao, lerJson, responderErro } from "@/lib/api";
import { erroZod } from "@/lib/errors";
import { esquemaEtapa } from "@/lib/schemas";
import { moverEtapa } from "@/server/processos";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(req: Request, contexto: Contexto) {
  try {
    const ator = await atorDaRequisicao(req);
    const { id } = await contexto.params;
    const resultado = esquemaEtapa.safeParse(await lerJson(req));
    if (!resultado.success) throw erroZod(resultado.error);
    return NextResponse.json(await moverEtapa(ator, id, resultado.data.etapa, resultado.data.observacao));
  } catch (erro) {
    return responderErro(erro);
  }
}
