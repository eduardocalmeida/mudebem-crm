import { AppError } from "@/lib/errors";
import type { ProvedorMdfe } from "@/server/cte/contrato";

export type { ProvedorMdfe } from "@/server/cte/contrato";

class ProvedorMdfePendente implements ProvedorMdfe {
  readonly nome = "nenhum";

  async emitir(): Promise<void> {
    throw new AppError("O MDF-e ainda não está ligado. O CT-e pode ser referenciado quando o módulo entrar.", 501, "MODULO_AUSENTE");
  }

  async encerrar() {
    return this.emitir();
  }

  async cancelar() {
    return this.emitir();
  }
}

export function obterProvedorMdfe(): ProvedorMdfe {
  return new ProvedorMdfePendente();
}
