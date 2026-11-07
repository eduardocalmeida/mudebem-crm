import { NextResponse } from "next/server";
import { atorDaRequisicao, lerJson, responderErro } from "@/lib/api";
import { lerFiltro } from "@/lib/consulta";
import { erroZod } from "@/lib/errors";
import { esquemaCriarProcesso } from "@/lib/schemas";
import { criarProcesso, listarProcessos } from "@/server/processos";

export async function GET(req: Request) {
  try {
    await atorDaRequisicao(req);
    const filtro = lerFiltro(new URL(req.url).searchParams);
    const lista = await listarProcessos(filtro);
    return NextResponse.json(lista);
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function POST(req: Request) {
  try {
    const ator = await atorDaRequisicao(req);
    const resultado = esquemaCriarProcesso.safeParse(await lerJson(req));
    if (!resultado.success) throw erroZod(resultado.error);
    const processo = await criarProcesso(ator, resultado.data);
    return NextResponse.json(processo, { status: 201 });
  } catch (erro) {
    return responderErro(erro);
  }
}
