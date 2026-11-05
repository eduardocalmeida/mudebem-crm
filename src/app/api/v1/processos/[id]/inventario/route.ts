import { NextResponse } from "next/server";
import { atorDaRequisicao, lerJson, responderErro } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { adicionarItens, obterInventario, type EntradaItem } from "@/server/inventario";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await atorDaRequisicao(req);
    const { id } = await params;
    return NextResponse.json(await obterInventario(id));
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await atorDaRequisicao(req);
    const { id } = await params;
    const corpo = (await lerJson(req)) as { itens?: EntradaItem[] };
    if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) {
      throw new AppError("Envie ao menos um item.", 400, "DADOS_INVALIDOS");
    }
    const resultado = await adicionarItens(id, corpo.itens);
    return NextResponse.json(resultado, { status: 201 });
  } catch (erro) {
    return responderErro(erro);
  }
}
