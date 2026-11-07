import { NextResponse } from "next/server";
import { atorDaRequisicao, lerJson, responderErro } from "@/lib/api";
import { erroZod } from "@/lib/errors";
import { esquemaCliente } from "@/lib/schemas";
import { criarCliente, listarClientes } from "@/server/clientes";

export async function GET(req: Request) {
  try {
    await atorDaRequisicao(req);
    const q = new URL(req.url).searchParams.get("q") ?? undefined;
    return NextResponse.json({ dados: await listarClientes(q) });
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function POST(req: Request) {
  try {
    const ator = await atorDaRequisicao(req);
    const resultado = esquemaCliente.safeParse(await lerJson(req));
    if (!resultado.success) throw erroZod(resultado.error);
    return NextResponse.json(await criarCliente(ator, resultado.data), { status: 201 });
  } catch (erro) {
    return responderErro(erro);
  }
}
