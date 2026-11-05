import { NextResponse } from "next/server";
import { atorDaRequisicao, responderErro } from "@/lib/api";
import { CANAIS, fluxoEtapas } from "@/lib/domain";
import { carregarEtapas } from "@/server/etapas";

export async function GET(req: Request) {
  try {
    await atorDaRequisicao(req);
    const etapas = await carregarEtapas();
    const fluxo = fluxoEtapas(etapas);
    return NextResponse.json({
      fluxo: fluxo.map((etapa, indice) => ({
        id: etapa.slug,
        ordem: indice + 1,
        rotulo: etapa.rotulo,
        resumo: etapa.resumo,
        grupo: etapa.grupo,
      })),
      terminais: etapas.filter((etapa) => etapa.grupo === "terminal").map((etapa) => ({
        id: etapa.slug,
        rotulo: etapa.rotulo,
        resumo: etapa.resumo,
      })),
      canais: CANAIS,
    });
  } catch (erro) {
    return responderErro(erro);
  }
}
