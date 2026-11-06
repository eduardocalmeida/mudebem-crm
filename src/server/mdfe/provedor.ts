import type { ProvedorMdfe } from "@/server/cte/contrato";
import { ProvedorWebmaniaMdfe } from "@/server/mdfe/webmania";

export type { ProvedorMdfe, RascunhoMdfe } from "@/server/cte/contrato";

export function obterProvedorMdfe(): ProvedorMdfe {
  return new ProvedorWebmaniaMdfe();
}
