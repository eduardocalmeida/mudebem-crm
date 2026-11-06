export const PAPEL_IDS = ["ADMIN", "COMERCIAL", "OPERACAO", "FINANCEIRO"] as const;
export type Papel = (typeof PAPEL_IDS)[number];

export type GrupoEtapa = "comercial" | "operacao" | "financeiro" | "terminal";

export type EtapaConfig = {
  slug: string;
  rotulo: string;
  resumo: string;
  cor: string;
  ordem: number;
  grupo: GrupoEtapa;
  terminal: boolean;
};

export const ETAPAS_PADRAO: EtapaConfig[] = [
  { slug: "LEADS_DE_ENTRADA", rotulo: "Leads de entrada", resumo: "Lead recém-chegado, ainda sem contato qualificado.", cor: "#3d6b8c", ordem: 10, grupo: "comercial", terminal: false },
  { slug: "CONTATO_INICIAL", rotulo: "Contato inicial", resumo: "Primeiro retorno feito ao cliente.", cor: "#4d7ea8", ordem: 20, grupo: "comercial", terminal: false },
  { slug: "PRECIFICACAO", rotulo: "Precificação", resumo: "Montagem do preço de frete, seguro e transporte.", cor: "#2f6f6a", ordem: 30, grupo: "comercial", terminal: false },
  { slug: "PROPOSTA", rotulo: "Proposta", resumo: "Proposta enviada ao cliente.", cor: "#1e4d3a", ordem: 40, grupo: "comercial", terminal: false },
  { slug: "NEGOCIACAO", rotulo: "Negociação", resumo: "Ajustes de escopo, data ou valor.", cor: "#b5842f", ordem: 50, grupo: "comercial", terminal: false },
  { slug: "PRIORIDADE", rotulo: "Prioridade", resumo: "Oportunidade quente, com decisão próxima.", cor: "#c47b2a", ordem: 60, grupo: "comercial", terminal: false },
  { slug: "CONTRATO", rotulo: "Contrato", resumo: "Fechado, com contrato ou OC.", cor: "#c45c26", ordem: 70, grupo: "comercial", terminal: false },
  { slug: "A_EXECUTAR", rotulo: "A executar", resumo: "Na fila da operação, aguardando a coleta.", cor: "#a3472c", ordem: 80, grupo: "operacao", terminal: false },
  { slug: "EM_EXECUCAO", rotulo: "Em execução", resumo: "Coleta, trânsito ou entrega em curso.", cor: "#8a3b28", ordem: 90, grupo: "operacao", terminal: false },
  { slug: "FATURADO_HAVER", rotulo: "Faturado/Haver", resumo: "Serviço faturado ou com haver a conciliar.", cor: "#6e4c7a", ordem: 100, grupo: "financeiro", terminal: false },
  { slug: "CONTAS_A_RECEBER", rotulo: "Contas a receber", resumo: "Título em aberto no financeiro.", cor: "#5c3d78", ordem: 110, grupo: "financeiro", terminal: false },
  { slug: "RECEBIDO", rotulo: "Recebido", resumo: "Valor entrou no caixa.", cor: "#1f6b45", ordem: 120, grupo: "financeiro", terminal: true },
  { slug: "GANHO", rotulo: "Ganho", resumo: "Oportunidade ganha.", cor: "#2e7d4f", ordem: 130, grupo: "terminal", terminal: true },
  { slug: "PERDIDO", rotulo: "Perdido", resumo: "Cliente desistiu ou a proposta foi recusada.", cor: "#8a8175", ordem: 140, grupo: "terminal", terminal: true },
];

export type Etapa = string;

export const CANAL_IDS = ["EMAIL", "SITE", "WHATSAPP", "INDICACAO"] as const;
export type Canal = (typeof CANAL_IDS)[number];

export const ETAPAS = ETAPAS_PADRAO.map((etapa) => ({
  id: etapa.slug,
  rotulo: etapa.rotulo,
  resumo: etapa.resumo,
  cor: etapa.cor,
}));

export type Autoridade = Papel | "API";

export type MetaEtapa = {
  id: string;
  rotulo: string;
  resumo: string;
  cor: string;
};

export const CANAIS: { id: Canal; rotulo: string }[] = [
  { id: "EMAIL", rotulo: "E-mail" },
  { id: "SITE", rotulo: "Site" },
  { id: "WHATSAPP", rotulo: "WhatsApp" },
  { id: "INDICACAO", rotulo: "Indicação" },
];

export const PAPEIS: { id: Papel; rotulo: string }[] = [
  { id: "ADMIN", rotulo: "Administrador" },
  { id: "COMERCIAL", rotulo: "Comercial" },
  { id: "OPERACAO", rotulo: "Operação" },
  { id: "FINANCEIRO", rotulo: "Financeiro" },
];

export const CAMPOS = [
  "titulo",
  "canal",
  "clienteId",
  "contatoId",
  "colaborador",
  "origemEndereco",
  "origemCidade",
  "origemUf",
  "destinoEndereco",
  "destinoCidade",
  "destinoUf",
  "dataColeta",
  "dataEntrega",
  "inventario",
  "valorCotado",
  "valorAprovado",
  "numeroOc",
  "numeroCte",
  "numeroNf",
  "dataVencimento",
  "dataRecebimento",
  "responsavelId",
  "origemReferencia",
  "origemAndar",
  "origemElevador",
  "origemImovel",
  "destinoReferencia",
  "destinoAndar",
  "destinoElevador",
  "destinoImovel",
  "modalidade",
  "descricaoColeta",
  "descricaoEntrega",
  "embalagemNecessaria",
  "volume",
  "itensEspeciais",
  "dataPretendida",
  "dataPrevista",
  "dataEmissao",
  "diasParaColetar",
  "diasParaViagem",
  "motoristaNome",
  "motoristaPlaca",
  "motoristaAntt",
  "motoristaCnh",
  "motoristaCpf",
  "valorFrete",
  "valorSeguro",
  "valorTransporte",
  "valorTotal",
  "formaPagamento",
  "validadeProposta",
  "linkProposta",
  "linkContrato",
  "linkContratoCarreteiro",
  "linkOs",
  "linkRecibo",
  "fonte",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "fbclid",
  "gclid",
  "metaCampaignId",
  "metaAdId",
  "referrer",
  "formulario",
] as const;
export type Campo = (typeof CAMPOS)[number];

const CAMPOS_COMERCIAL: Campo[] = [
  "titulo",
  "canal",
  "clienteId",
  "contatoId",
  "colaborador",
  "origemEndereco",
  "origemCidade",
  "origemUf",
  "destinoEndereco",
  "destinoCidade",
  "destinoUf",
  "dataColeta",
  "dataEntrega",
  "inventario",
  "valorCotado",
  "valorAprovado",
  "numeroOc",
  "responsavelId",
  "origemReferencia",
  "origemAndar",
  "origemElevador",
  "origemImovel",
  "destinoReferencia",
  "destinoAndar",
  "destinoElevador",
  "destinoImovel",
  "modalidade",
  "descricaoColeta",
  "descricaoEntrega",
  "embalagemNecessaria",
  "volume",
  "itensEspeciais",
  "dataPretendida",
  "dataPrevista",
  "diasParaColetar",
  "diasParaViagem",
  "valorFrete",
  "valorSeguro",
  "valorTotal",
  "formaPagamento",
  "validadeProposta",
  "fonte",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "fbclid",
  "gclid",
  "metaCampaignId",
  "metaAdId",
  "referrer",
  "formulario",
];

const CAMPOS_OPERACAO: Campo[] = [
  "colaborador",
  "origemEndereco",
  "origemCidade",
  "origemUf",
  "destinoEndereco",
  "destinoCidade",
  "destinoUf",
  "dataColeta",
  "dataEntrega",
  "inventario",
  "numeroCte",
  "origemReferencia",
  "origemAndar",
  "origemElevador",
  "origemImovel",
  "destinoReferencia",
  "destinoAndar",
  "destinoElevador",
  "destinoImovel",
  "descricaoColeta",
  "descricaoEntrega",
  "embalagemNecessaria",
  "volume",
  "itensEspeciais",
  "dataPrevista",
  "diasParaColetar",
  "diasParaViagem",
];

const CAMPOS_FINANCEIRO: Campo[] = [
  "valorAprovado",
  "numeroOc",
  "numeroNf",
  "dataVencimento",
  "dataRecebimento",
  "valorFrete",
  "valorSeguro",
  "valorTotal",
  "formaPagamento",
  "dataEmissao",
];

const ROTULO_CAMPO: Record<Campo, string> = {
  titulo: "título",
  canal: "canal",
  clienteId: "cliente",
  contatoId: "contato",
  colaborador: "colaborador",
  origemEndereco: "endereço de origem",
  origemCidade: "cidade de origem",
  origemUf: "UF de origem",
  destinoEndereco: "endereço de destino",
  destinoCidade: "cidade de destino",
  destinoUf: "UF de destino",
  dataColeta: "data de coleta",
  dataEntrega: "data de entrega",
  inventario: "inventário",
  valorCotado: "valor cotado",
  valorAprovado: "valor aprovado",
  numeroOc: "OC",
  numeroCte: "CT-e",
  numeroNf: "NF/fatura",
  dataVencimento: "vencimento",
  dataRecebimento: "recebimento",
  responsavelId: "responsável",
  origemReferencia: "ponto de referência de origem",
  origemAndar: "andar de origem",
  origemElevador: "elevador de origem",
  origemImovel: "imóvel de origem",
  destinoReferencia: "ponto de referência de destino",
  destinoAndar: "andar de destino",
  destinoElevador: "elevador de destino",
  destinoImovel: "imóvel de destino",
  modalidade: "modalidade",
  descricaoColeta: "coleta",
  descricaoEntrega: "entrega",
  embalagemNecessaria: "embalagem",
  volume: "volume",
  itensEspeciais: "itens especiais",
  dataPretendida: "data pretendida",
  dataPrevista: "data prevista",
  dataEmissao: "data de emissão",
  diasParaColetar: "dias para coletar",
  diasParaViagem: "dias para viagem",
  motoristaNome: "motorista",
  motoristaPlaca: "placa",
  motoristaAntt: "ANTT",
  motoristaCnh: "CNH",
  motoristaCpf: "CPF do motorista",
  valorFrete: "valor do frete",
  valorSeguro: "valor do seguro",
  valorTransporte: "valor do transporte",
  valorTotal: "valor total",
  formaPagamento: "forma de pagamento",
  validadeProposta: "validade da proposta",
  linkProposta: "link da proposta",
  linkContrato: "link do contrato",
  linkContratoCarreteiro: "link do contrato do carreteiro",
  linkOs: "link da O.S.",
  linkRecibo: "link do recibo",
  fonte: "fonte",
  utmSource: "utm_source",
  utmMedium: "utm_medium",
  utmCampaign: "utm_campaign",
  utmTerm: "utm_term",
  utmContent: "utm_content",
  fbclid: "fbclid",
  gclid: "gclid",
  metaCampaignId: "campanha Meta",
  metaAdId: "anúncio Meta",
  referrer: "referrer",
  formulario: "formulário",
};

export function ehEtapa(valor: string, catalogo: EtapaConfig[] = ETAPAS_PADRAO): valor is string {
  return catalogo.some((etapa) => etapa.slug === valor);
}

export function fluxoEtapas(catalogo: EtapaConfig[] = ETAPAS_PADRAO) {
  return catalogo.filter((etapa) => etapa.grupo !== "terminal").sort((a, b) => a.ordem - b.ordem);
}

export function etapaInicial(catalogo: EtapaConfig[] = ETAPAS_PADRAO) {
  return fluxoEtapas(catalogo)[0]?.slug ?? "LEADS_DE_ENTRADA";
}

export function ehCanal(valor: string): valor is Canal {
  return (CANAL_IDS as readonly string[]).includes(valor);
}

export function ehPapel(valor: string): valor is Papel {
  return (PAPEL_IDS as readonly string[]).includes(valor);
}

export function etapaPorId(id: string, catalogo: EtapaConfig[] = ETAPAS_PADRAO): MetaEtapa {
  const etapa = catalogo.find((item) => item.slug === id);
  if (!etapa) return { id, rotulo: id, resumo: "", cor: "#8a8175" };
  return { id: etapa.slug, rotulo: etapa.rotulo, resumo: etapa.resumo, cor: etapa.cor };
}

export function rotuloEtapa(id: string, catalogo: EtapaConfig[] = ETAPAS_PADRAO): string {
  return etapaPorId(id, catalogo).rotulo;
}

export function rotuloCanal(id: Canal): string {
  return CANAIS.find((canal) => canal.id === id)?.rotulo ?? id;
}

export function rotuloPapel(id: Papel): string {
  return PAPEIS.find((papel) => papel.id === id)?.rotulo ?? id;
}

export function rotuloCampo(campo: Campo): string {
  return ROTULO_CAMPO[campo];
}

const FORA_DA_FICHA = new Set<Campo>([
  "motoristaNome",
  "motoristaPlaca",
  "motoristaAntt",
  "motoristaCnh",
  "motoristaCpf",
  "linkProposta",
  "linkContrato",
  "linkContratoCarreteiro",
  "linkOs",
  "linkRecibo",
  "valorTransporte",
  "titulo",
]);

export function camposDoPapel(papel: Papel): Campo[] {
  const lista =
    papel === "ADMIN" ? CAMPOS : papel === "COMERCIAL" ? CAMPOS_COMERCIAL : papel === "OPERACAO" ? CAMPOS_OPERACAO : CAMPOS_FINANCEIRO;
  return lista.filter((campo) => !FORA_DA_FICHA.has(campo));
}

export function podeCriarProcesso(autoridade: Autoridade): boolean {
  return autoridade === "API" || autoridade === "ADMIN" || autoridade === "COMERCIAL";
}

export function podeGerirClientes(autoridade: Autoridade): boolean {
  return autoridade === "API" || autoridade === "ADMIN" || autoridade === "COMERCIAL";
}

export function validarTransicao(
  autoridade: Autoridade,
  deSlug: string,
  paraSlug: string,
  catalogo: EtapaConfig[] = ETAPAS_PADRAO,
): string | null {
  const de = catalogo.find((etapa) => etapa.slug === deSlug);
  const para = catalogo.find((etapa) => etapa.slug === paraSlug);
  if (!de || !para) return "Etapa inválida.";
  if (de.slug === para.slug) return "O processo já está nesta etapa.";
  if (autoridade === "API" || autoridade === "ADMIN") return null;
  if (de.terminal) return "Só um administrador pode reabrir um processo encerrado.";

  if (para.slug === "PERDIDO") {
    if (autoridade === "COMERCIAL" && de.grupo === "comercial") return null;
    return "Seu papel não pode marcar este processo como perdido.";
  }
  if (para.slug === "GANHO") {
    if (autoridade === "COMERCIAL") return null;
    return "Só o comercial marca o processo como ganho.";
  }

  const linha = fluxoEtapas(catalogo);
  const indiceDe = linha.findIndex((etapa) => etapa.slug === de.slug);
  const indicePara = linha.findIndex((etapa) => etapa.slug === para.slug);
  if (indiceDe < 0 || indicePara < 0) return "Etapa inválida.";
  if (indicePara < indiceDe) return "Seu papel só pode avançar o processo na pipeline.";

  if (autoridade === "COMERCIAL") {
    if (para.grupo !== "comercial") return "O comercial move o processo até Contrato.";
    return null;
  }

  if (autoridade === "OPERACAO") {
    const proxima = linha[indiceDe + 1];
    if (!proxima || proxima.slug !== para.slug || para.grupo !== "operacao") {
      return "A operação avança uma etapa por vez, de Contrato até Em execução.";
    }
    if (de.grupo !== "operacao" && de.slug !== "CONTRATO") return "A operação recebe processos a partir de Contrato.";
    return null;
  }

  if (autoridade === "FINANCEIRO") {
    const proxima = linha[indiceDe + 1];
    if (!proxima || proxima.slug !== para.slug || para.grupo !== "financeiro") {
      return "O financeiro avança uma etapa por vez, de Faturado/Haver até Recebido.";
    }
    if (de.grupo !== "financeiro" && de.slug !== "EM_EXECUCAO") {
      return "O financeiro recebe processos a partir de Em execução.";
    }
    return null;
  }

  return "Transição não permitida.";
}

export function destinosPossiveis(autoridade: Autoridade, de: string, catalogo: EtapaConfig[] = ETAPAS_PADRAO): string[] {
  return catalogo.filter((etapa) => validarTransicao(autoridade, de, etapa.slug, catalogo) === null).map((etapa) => etapa.slug);
}
