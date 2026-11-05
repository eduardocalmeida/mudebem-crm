import { NextResponse } from "next/server";
import { responderErro } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { ipDaRequisicao, receberLeadPublico, registrarEnvioFormulario } from "@/server/formulario-publico";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(corpo: unknown, status = 200) {
  return NextResponse.json(corpo, { status, headers: CORS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  try {
    if (!registrarEnvioFormulario(ipDaRequisicao(req))) {
      throw new AppError("Muitos envios a partir desta rede. Tente de novo em alguns minutos.", 429, "LIMITE");
    }
    let corpo: unknown;
    try {
      corpo = await req.json();
    } catch {
      throw new AppError("JSON inválido.", 400, "DADOS_INVALIDOS");
    }
    const resultado = await receberLeadPublico(corpo);
    if ("ignorado" in resultado) return json({ recebido: true });
    return json(resultado, 201);
  } catch (erro) {
    const resposta = responderErro(erro);
    for (const [chave, valor] of Object.entries(CORS)) resposta.headers.set(chave, valor);
    return resposta;
  }
}
