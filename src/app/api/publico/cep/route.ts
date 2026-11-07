import { NextResponse } from "next/server";
import { consultarCep } from "@/server/cep-publico";

export const dynamic = "force-dynamic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  const cep = new URL(req.url).searchParams.get("cep") || "";
  if (cep.replace(/\D/g, "").length !== 8) {
    return NextResponse.json({ erro: "CEP inválido.", encontrado: false }, { status: 400, headers: CORS });
  }
  const endereco = await consultarCep(cep);
  if (!endereco) {
    return NextResponse.json({ erro: "CEP não encontrado.", encontrado: false }, { status: 404, headers: CORS });
  }
  return NextResponse.json({
    encontrado: true,
    endereco: [endereco.logradouro, endereco.bairro].filter(Boolean).join(", "),
    logradouro: endereco.logradouro,
    bairro: endereco.bairro,
    cidade: endereco.cidade,
    uf: endereco.uf,
    cep: endereco.cep,
  }, { headers: CORS });
}
