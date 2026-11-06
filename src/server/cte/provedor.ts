import { ProvedorWebmania } from "@/server/cte/webmania";
import type { ProvedorCte } from "@/server/cte/contrato";

export type { PedidoHttpCte, ProvedorCte } from "@/server/cte/contrato";

export function obterProvedorCte(): ProvedorCte {
  return new ProvedorWebmania();
}
