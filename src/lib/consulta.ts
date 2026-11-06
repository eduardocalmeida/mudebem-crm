import { ehCanal, type Canal, type Etapa } from "@/lib/domain";
import { AppError } from "@/lib/errors";
import { interpretarData } from "@/lib/format";

export type FiltroLista = {
  q?: string;
  etapa?: Etapa;
  canal?: Canal;
  clienteId?: string;
  responsavelId?: string;
  dataColetaDe?: string;
  dataColetaAte?: string;
  pagina: number;
  porPagina: number;
  visao: "kanban" | "lista";
  etiqueta?: string;
};

function dataParam(params: URLSearchParams, nome: string) {
  const valor = params.get(nome)?.trim();
  if (!valor) return undefined;
  const iso = interpretarData(valor);
  if (!iso) throw new AppError(`A data "${nome}" é inválida. Use dd/mm/aaaa.`, 400, "DADOS_INVALIDOS");
  return iso;
}

export function lerFiltro(params: URLSearchParams): FiltroLista {
  const etapa = params.get("etapa")?.trim() || undefined;
  const canal = params.get("canal")?.trim() || undefined;
  if (etapa && !/^[A-Za-z0-9_-]{1,40}$/.test(etapa)) throw new AppError("Etapa inválida.", 400, "DADOS_INVALIDOS");
  if (canal && !ehCanal(canal)) throw new AppError("Canal inválido.", 400, "DADOS_INVALIDOS");
  const paginaBruta = Number(params.get("pagina") ?? "1");
  const tamanhoBruto = Number(params.get("porPagina") ?? "50");
  const visao = params.get("visao") === "lista" ? "lista" : "kanban";
  return {
    q: params.get("q")?.trim() || undefined,
    etapa: etapa as Etapa | undefined,
    canal: canal as Canal | undefined,
    clienteId: params.get("clienteId")?.trim() || undefined,
    etiqueta: params.get("etiqueta")?.trim() || undefined,
    responsavelId: params.get("responsavelId")?.trim() || undefined,
    dataColetaDe: dataParam(params, "de"),
    dataColetaAte: dataParam(params, "ate"),
    pagina: Number.isInteger(paginaBruta) && paginaBruta > 0 ? paginaBruta : 1,
    porPagina: Number.isInteger(tamanhoBruto) && tamanhoBruto > 0 ? Math.min(100, tamanhoBruto) : 50,
    visao,
  };
}

export function parametrosDe(filtro: {
  visao?: "kanban" | "lista";
  q?: string;
  etapa?: string;
  canal?: string;
  clienteId?: string;
  etiqueta?: string;
  responsavelId?: string;
  dataColetaDe?: string;
  dataColetaAte?: string;
  pagina?: number;
}) {
  const params = new URLSearchParams();
  const entradas: [string, string | undefined][] = [
    ["visao", filtro.visao],
    ["q", filtro.q],
    ["etapa", filtro.etapa],
    ["canal", filtro.canal],
    ["clienteId", filtro.clienteId],
    ["etiqueta", filtro.etiqueta],
    ["responsavelId", filtro.responsavelId],
    ["de", filtro.dataColetaDe],
    ["ate", filtro.dataColetaAte],
    ["pagina", filtro.pagina && filtro.pagina > 1 ? String(filtro.pagina) : undefined],
  ];
  for (const [chave, valor] of entradas) {
    if (valor) params.set(chave, valor);
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}
