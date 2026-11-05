import { NextResponse } from "next/server";
import { atorDaRequisicao, responderErro } from "@/lib/api";
import { listarCatalogo } from "@/server/inventario";

export async function GET(req: Request) {
  try {
    await atorDaRequisicao(req);
    const itens = await listarCatalogo();
    return NextResponse.json(
      itens.map((item) => ({
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        volumeM3: item.volumeM3.toNumber(),
      })),
    );
  } catch (erro) {
    return responderErro(erro);
  }
}
