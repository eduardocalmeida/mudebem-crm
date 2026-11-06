import type { RascunhoCte } from "@/server/cte/rascunho";

export type PedidoHttpCte = {
  metodo: "POST" | "PUT" | "GET";
  url: string;
  cabecalhos: Record<string, string>;
  corpo: Record<string, unknown> | null;
  pendencias: string[];
  enviado: false;
};

export interface ProvedorCte {
  readonly nome: string;
  prepararEmissao(rascunho: RascunhoCte): PedidoHttpCte;
  emitir(rascunho: RascunhoCte): Promise<void>;
  prepararCancelamento(chave: string, justificativa: string): PedidoHttpCte;
  cancelar(chave: string, justificativa: string): Promise<void>;
  prepararCartaCorrecao(chave: string, grupo: string, campo: string, valor: string): PedidoHttpCte;
  cartaCorrecao(chave: string, grupo: string, campo: string, valor: string): Promise<void>;
}

export interface ProvedorMdfe {
  readonly nome: string;
  emitir(): Promise<void>;
  encerrar(): Promise<void>;
  cancelar(): Promise<void>;
}
