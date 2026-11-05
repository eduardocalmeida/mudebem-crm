import { AppError } from "@/lib/errors";

export type ResultadoEmissaoCte = {
  chave: string;
  numero: string;
  serie: string;
  status: "AUTORIZADO" | "REJEITADO";
  xmlUrl?: string;
  dacteUrl?: string;
  protocolo?: string;
};

export interface ProvedorCte {
  readonly nome: string;
  emitir(cteId: string): Promise<ResultadoEmissaoCte>;
}

export class ProvedorCtePendente implements ProvedorCte {
  readonly nome = "nenhum";

  async emitir(): Promise<ResultadoEmissaoCte> {
    throw new AppError(
      "Nenhum provedor de CT-e está configurado. A emissão pela SEFAZ entra quando a API for escolhida.",
      501,
      "PROVEDOR_AUSENTE",
    );
  }
}

export function obterProvedorCte(): ProvedorCte {
  return new ProvedorCtePendente();
}
