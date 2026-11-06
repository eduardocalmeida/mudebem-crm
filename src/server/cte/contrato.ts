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

export type RascunhoMdfe = {
  ufInicio: string | null;
  ufFim: string | null;
  percurso: string[];
  carregamento: { nome: string }[];
  descarregamento: { nome: string; chaves: string[] }[];
  placa: string | null;
  renavam: string | null;
  taraKg: number | null;
  capacidadeKg: number | null;
  capacidadeM3: number | null;
  condutorNome: string | null;
  condutorCpf: string | null;
  rntrc: string | null;
  seguradoraNome: string | null;
  seguradoraCnpj: string | null;
  apolice: string | null;
  averbacoes: string[];
  valorCarga: number | null;
  pesoBruto: number | null;
};

export interface ProvedorMdfe {
  readonly nome: string;
  prepararEmissao(rascunho: RascunhoMdfe): PedidoHttpCte;
  emitir(rascunho: RascunhoMdfe): Promise<void>;
  prepararEncerramento(chave: string, uf: string, municipio: string): PedidoHttpCte;
  encerrar(chave: string, uf: string, municipio: string): Promise<void>;
  prepararCancelamento(chave: string, justificativa: string): PedidoHttpCte;
  cancelar(chave: string, justificativa: string): Promise<void>;
}
