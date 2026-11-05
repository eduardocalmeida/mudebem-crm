import { NextResponse } from "next/server";
import { atorDaRequisicao, responderErro } from "@/lib/api";
import { CANAIS, ETAPAS, FLUXO } from "@/lib/domain";

export async function GET(req: Request) {
  try {
    await atorDaRequisicao(req);
    return NextResponse.json({
      fluxo: FLUXO.map((id, ordem) => {
        const etapa = ETAPAS.find((item) => item.id === id)!;
        return { id, ordem: ordem + 1, rotulo: etapa.rotulo, resumo: etapa.resumo };
      }),
      terminal: ETAPAS.filter((etapa) => etapa.id === "PERDIDO_DECLINADO").map((etapa) => ({
        id: etapa.id,
        rotulo: etapa.rotulo,
        resumo: etapa.resumo,
      }))[0],
      canais: CANAIS,
    });
  } catch (erro) {
    return responderErro(erro);
  }
}
