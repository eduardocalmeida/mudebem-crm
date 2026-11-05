import { NextResponse } from "next/server";
import { atorDaRequisicao, responderErro } from "@/lib/api";

export async function GET(req: Request) {
  try {
    await atorDaRequisicao(req);
    return NextResponse.json({
      nome: "Mude Bem CRM API",
      versao: "1",
      autenticacao: "Authorization: Bearer <chave> ou cabeçalho X-API-Key",
      recursos: {
        etapas: "/api/v1/etapas",
        processos: "/api/v1/processos",
        clientes: "/api/v1/clientes",
      },
    });
  } catch (erro) {
    return responderErro(erro);
  }
}
