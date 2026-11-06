import { ehCanal, type Canal, type Etapa } from "@/lib/domain";
import { AppError } from "@/lib/errors";
import { interpretarData } from "@/lib/format";

export type FiltroLista = {
  q?: string;
  etapa?: Etapa;
  etapas?: Etapa[];
  canal?: Canal;
  clienteId?: string;
  responsavelId?: string;
  semResponsavel?: boolean;
  origem?: string;
  destino?: string;
  dataColetaDe?: string;
  dataColetaAte?: string;
  freteMin?: number;
  freteMax?: number;
  seguroMin?: number;
  seguroMax?: number;
  totalMin?: number;
  totalMax?: number;
  resultado?: "ganho" | "perdido";
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

function textoCurto(params: URLSearchParams, nome: string, rotulo: string) {
  const valor = params.get(nome)?.trim();
  if (!valor) return undefined;
  if (valor.length > 80) throw new AppError(`${rotulo} pode ter no máximo 80 caracteres.`, 400, "DADOS_INVALIDOS");
  return valor;
}

function dinheiroParam(params: URLSearchParams, nome: string, rotulo: string) {
  const valor = params.get(nome)?.trim();
  if (!valor) return undefined;
  const normalizado = valor.includes(",") ? valor.replace(/\./g, "").replace(",", ".") : valor;
  const numero = Number(normalizado);
  if (!Number.isFinite(numero) || numero < 0 || numero > 9_999_999_999.99) {
    throw new AppError(`${rotulo} precisa ser um valor em reais entre 0 e 9999999999,99.`, 400, "DADOS_INVALIDOS");
  }
  return Math.round(numero * 100) / 100;
}

function faixa(min: number | undefined, max: number | undefined, rotulo: string) {
  if (min != null && max != null && min > max) throw new AppError(`${rotulo}: o mínimo não pode ser maior que o máximo.`, 400, "DADOS_INVALIDOS");
}

export function lerFiltro(params: URLSearchParams): FiltroLista {
  const etapa = params.get("etapa")?.trim() || undefined;
  const etapasBrutas = params
    .getAll("etapas")
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
  const etapas = [...new Set([...(etapa ? [etapa] : []), ...etapasBrutas])];
  if (etapas.length > 20) throw new AppError("Selecione no máximo 20 etapas.", 400, "DADOS_INVALIDOS");
  for (const item of etapas) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(item)) throw new AppError("Etapa inválida.", 400, "DADOS_INVALIDOS");
  }
  const canal = params.get("canal")?.trim() || undefined;
  if (canal && !ehCanal(canal)) throw new AppError("Canal inválido.", 400, "DADOS_INVALIDOS");
  const responsavel = params.get("responsavelId")?.trim() || undefined;
  if (responsavel && responsavel !== "nenhum" && !/^[A-Za-z0-9_-]{1,40}$/.test(responsavel)) {
    throw new AppError("Responsável inválido.", 400, "DADOS_INVALIDOS");
  }
  const de = dataParam(params, "de");
  const ate = dataParam(params, "ate");
  if (de && ate && de > ate) throw new AppError("A data de coleta inicial não pode ser posterior à final.", 400, "DADOS_INVALIDOS");
  const freteMin = dinheiroParam(params, "freteMin", "Frete mínimo");
  const freteMax = dinheiroParam(params, "freteMax", "Frete máximo");
  const seguroMin = dinheiroParam(params, "seguroMin", "Seguro mínimo");
  const seguroMax = dinheiroParam(params, "seguroMax", "Seguro máximo");
  const totalMin = dinheiroParam(params, "totalMin", "Valor total mínimo");
  const totalMax = dinheiroParam(params, "totalMax", "Valor total máximo");
  faixa(freteMin, freteMax, "Frete");
  faixa(seguroMin, seguroMax, "Seguro");
  faixa(totalMin, totalMax, "Valor total");
  const resultadoBruto = params.get("resultado")?.trim() || undefined;
  if (resultadoBruto && resultadoBruto !== "ganho" && resultadoBruto !== "perdido") {
    throw new AppError("Resultado inválido. Use ganho ou perdido.", 400, "DADOS_INVALIDOS");
  }
  const paginaBruta = Number(params.get("pagina") ?? "1");
  const tamanhoBruto = Number(params.get("porPagina") ?? "50");
  const visao = params.get("visao") === "lista" ? "lista" : "kanban";
  const q = params.get("q")?.trim() || undefined;
  if (q && q.length > 120) throw new AppError("A busca pode ter no máximo 120 caracteres.", 400, "DADOS_INVALIDOS");
  return {
    q,
    etapa: etapas[0] as Etapa | undefined,
    etapas: etapas as Etapa[],
    canal: canal as Canal | undefined,
    clienteId: params.get("clienteId")?.trim() || undefined,
    etiqueta: textoCurto(params, "etiqueta", "Contrato"),
    responsavelId: responsavel === "nenhum" ? undefined : responsavel,
    semResponsavel: responsavel === "nenhum",
    origem: textoCurto(params, "origem", "Origem"),
    destino: textoCurto(params, "destino", "Destino"),
    dataColetaDe: de,
    dataColetaAte: ate,
    freteMin,
    freteMax,
    seguroMin,
    seguroMax,
    totalMin,
    totalMax,
    resultado: resultadoBruto as "ganho" | "perdido" | undefined,
    pagina: Number.isInteger(paginaBruta) && paginaBruta > 0 ? paginaBruta : 1,
    porPagina: Number.isInteger(tamanhoBruto) && tamanhoBruto > 0 ? Math.min(100, tamanhoBruto) : 50,
    visao,
  };
}

function numeroParam(valor: number | undefined) {
  return valor == null ? undefined : String(valor);
}

export function parametrosDe(filtro: {
  visao?: "kanban" | "lista";
  q?: string;
  etapa?: string;
  etapas?: string[];
  canal?: string;
  clienteId?: string;
  etiqueta?: string;
  responsavelId?: string;
  semResponsavel?: boolean;
  origem?: string;
  destino?: string;
  dataColetaDe?: string;
  dataColetaAte?: string;
  freteMin?: number;
  freteMax?: number;
  seguroMin?: number;
  seguroMax?: number;
  totalMin?: number;
  totalMax?: number;
  resultado?: "ganho" | "perdido";
  pagina?: number;
}) {
  const params = new URLSearchParams();
  const etapas = filtro.etapas?.filter(Boolean) ?? (filtro.etapa ? [filtro.etapa] : []);
  const entradas: [string, string | undefined][] = [
    ["visao", filtro.visao],
    ["q", filtro.q],
    ["etapas", etapas.length ? etapas.join(",") : undefined],
    ["canal", filtro.canal],
    ["clienteId", filtro.clienteId],
    ["etiqueta", filtro.etiqueta],
    ["responsavelId", filtro.semResponsavel ? "nenhum" : filtro.responsavelId],
    ["origem", filtro.origem],
    ["destino", filtro.destino],
    ["de", filtro.dataColetaDe],
    ["ate", filtro.dataColetaAte],
    ["freteMin", numeroParam(filtro.freteMin)],
    ["freteMax", numeroParam(filtro.freteMax)],
    ["seguroMin", numeroParam(filtro.seguroMin)],
    ["seguroMax", numeroParam(filtro.seguroMax)],
    ["totalMin", numeroParam(filtro.totalMin)],
    ["totalMax", numeroParam(filtro.totalMax)],
    ["resultado", filtro.resultado],
    ["pagina", filtro.pagina && filtro.pagina > 1 ? String(filtro.pagina) : undefined],
  ];
  for (const [chave, valor] of entradas) {
    if (valor) params.set(chave, valor);
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}
