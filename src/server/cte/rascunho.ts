export type AtorCte = {
  nome: string;
  documento: string | null;
  ie: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  uf: string | null;
};

export type RascunhoCte = {
  finalidade: number;
  tipoServico: number;
  modal: string;
  cfop: string | null;
  naturezaOperacao: string;
  indicadorTomador: number;
  contribuicaoTomador: number;
  inicioCidade: string | null;
  inicioUf: string | null;
  fimCidade: string | null;
  fimUf: string | null;
  remetente: AtorCte;
  destinatario: AtorCte;
  expedidor: AtorCte | null;
  recebedor: AtorCte | null;
  tomador: AtorCte | null;
  valorServico: number | null;
  valorReceber: number | null;
  componentes: { nome: string; valor: number }[];
  produtoPredominante: string;
  valorMercadoria: number | null;
  caracteristicas: string | null;
  cubagemM3: number | null;
  documentos: { tipo: number; chave: string | null; numero: string | null }[];
  situacaoIcms: string;
  regime: string | null;
  reducaoBase: number | null;
  baseIcms: number | null;
  aliquotaIcms: number | null;
  valorIcms: number | null;
  creditoIcms: number | null;
  beneficioFiscal: string | null;
  partilhaIcms: boolean;
  ibsSituacao: string | null;
  ibsClassificacao: string | null;
  ibsBase: number | null;
  ibsAliquotaEstadual: number | null;
  ibsValorEstadual: number | null;
  ibsAliquotaMunicipal: number | null;
  ibsValorMunicipal: number | null;
  cbsAliquota: number | null;
  cbsValor: number | null;
  rntrc: string | null;
  veiculo: string | null;
  motorista: string | null;
  lacres: string[];
  observacoes: string | null;
};

export function atorVazio(nome = ""): AtorCte {
  return {
    nome,
    documento: null,
    ie: null,
    email: null,
    telefone: null,
    endereco: null,
    numero: null,
    complemento: null,
    bairro: null,
    cep: null,
    cidade: null,
    uf: null,
  };
}

export function rascunhoVazio(): RascunhoCte {
  return {
    finalidade: 0,
    tipoServico: 0,
    modal: "01",
    cfop: null,
    naturezaOperacao: "Prestação de serviço de transporte de mudança",
    indicadorTomador: 0,
    contribuicaoTomador: 9,
    inicioCidade: null,
    inicioUf: null,
    fimCidade: null,
    fimUf: null,
    remetente: atorVazio(),
    destinatario: atorVazio(),
    expedidor: null,
    recebedor: null,
    tomador: null,
    valorServico: null,
    valorReceber: null,
    componentes: [],
    produtoPredominante: "Móveis e utensílios domésticos",
    valorMercadoria: null,
    caracteristicas: null,
    cubagemM3: null,
    documentos: [],
    situacaoIcms: "00",
    regime: null,
    reducaoBase: null,
    baseIcms: null,
    aliquotaIcms: null,
    valorIcms: null,
    creditoIcms: null,
    beneficioFiscal: null,
    partilhaIcms: false,
    ibsSituacao: null,
    ibsClassificacao: null,
    ibsBase: null,
    ibsAliquotaEstadual: null,
    ibsValorEstadual: null,
    ibsAliquotaMunicipal: null,
    ibsValorMunicipal: null,
    cbsAliquota: null,
    cbsValor: null,
    rntrc: null,
    veiculo: null,
    motorista: null,
    lacres: [],
    observacoes: null,
  };
}

export function lerRascunho(valor: unknown): RascunhoCte {
  if (!valor || typeof valor !== "object") return rascunhoVazio();
  return { ...rascunhoVazio(), ...(valor as RascunhoCte) };
}
