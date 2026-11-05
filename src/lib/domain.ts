export const PAPEL_IDS = ["ADMIN", "COMERCIAL", "OPERACAO", "FINANCEIRO"] as const;
export type Papel = (typeof PAPEL_IDS)[number];

export const ETAPA_IDS = [
  "COTACAO_RECEBIDA",
  "PRECIFICACAO",
  "PROPOSTA_ENVIADA",
  "NEGOCIACAO",
  "FECHADO_CONTRATO",
  "EM_EXECUCAO",
  "FINALIZADO",
  "CONTAS_A_RECEBER",
  "RECEBIDO",
  "PERDIDO_DECLINADO",
] as const;
export type Etapa = (typeof ETAPA_IDS)[number];

export const CANAL_IDS = ["EMAIL", "SITE", "WHATSAPP", "INDICACAO"] as const;
export type Canal = (typeof CANAL_IDS)[number];

export const FLUXO: Etapa[] = [
  "COTACAO_RECEBIDA",
  "PRECIFICACAO",
  "PROPOSTA_ENVIADA",
  "NEGOCIACAO",
  "FECHADO_CONTRATO",
  "EM_EXECUCAO",
  "FINALIZADO",
  "CONTAS_A_RECEBER",
  "RECEBIDO",
];

export type Autoridade = Papel | "API";

export type MetaEtapa = {
  id: Etapa;
  rotulo: string;
  resumo: string;
  cor: string;
};

export const ETAPAS: MetaEtapa[] = [
  { id: "COTACAO_RECEBIDA", rotulo: "Cotação recebida", resumo: "Lead entrou e ainda vai ser avaliado.", cor: "#3d6b8c" },
  { id: "PRECIFICACAO", rotulo: "Precificação", resumo: "Operação e comercial montam o preço.", cor: "#2f6f6a" },
  { id: "PROPOSTA_ENVIADA", rotulo: "Proposta enviada", resumo: "A proposta já está com o cliente.", cor: "#1e4d3a" },
  { id: "NEGOCIACAO", rotulo: "Negociação", resumo: "Ajustes de escopo, data ou valor.", cor: "#b5842f" },
  { id: "FECHADO_CONTRATO", rotulo: "Fechado / Contrato", resumo: "Valor aprovado e OC em mãos.", cor: "#c45c26" },
  { id: "EM_EXECUCAO", rotulo: "Em execução", resumo: "Coleta, trânsito ou entrega em curso.", cor: "#a3472c" },
  { id: "FINALIZADO", rotulo: "Finalizado", resumo: "Serviço concluído, aguardando faturamento.", cor: "#3e7a5e" },
  { id: "CONTAS_A_RECEBER", rotulo: "Contas a receber", resumo: "NF emitida e ainda não recebida.", cor: "#6e4c7a" },
  { id: "RECEBIDO", rotulo: "Recebido", resumo: "Valor entrou no caixa.", cor: "#1f6b45" },
  { id: "PERDIDO_DECLINADO", rotulo: "Perdido/Declinado", resumo: "Cliente desistiu ou a proposta foi recusada.", cor: "#8a8175" },
];

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
];

const CAMPOS_FINANCEIRO: Campo[] = ["valorAprovado", "numeroOc", "numeroNf", "dataVencimento", "dataRecebimento"];

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
};

export function ehEtapa(valor: string): valor is Etapa {
  return (ETAPA_IDS as readonly string[]).includes(valor);
}

export function ehCanal(valor: string): valor is Canal {
  return (CANAL_IDS as readonly string[]).includes(valor);
}

export function ehPapel(valor: string): valor is Papel {
  return (PAPEL_IDS as readonly string[]).includes(valor);
}

export function etapaPorId(id: Etapa): MetaEtapa {
  return ETAPAS.find((etapa) => etapa.id === id) ?? ETAPAS[0];
}

export function rotuloEtapa(id: Etapa): string {
  return etapaPorId(id).rotulo;
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

export function camposDoPapel(papel: Papel): Campo[] {
  if (papel === "ADMIN") return [...CAMPOS];
  if (papel === "COMERCIAL") return [...CAMPOS_COMERCIAL];
  if (papel === "OPERACAO") return [...CAMPOS_OPERACAO];
  return [...CAMPOS_FINANCEIRO];
}

export function podeCriarProcesso(autoridade: Autoridade): boolean {
  return autoridade === "API" || autoridade === "ADMIN" || autoridade === "COMERCIAL";
}

export function podeGerirClientes(autoridade: Autoridade): boolean {
  return autoridade === "API" || autoridade === "ADMIN" || autoridade === "COMERCIAL";
}

export function validarTransicao(autoridade: Autoridade, de: Etapa, para: Etapa): string | null {
  if (de === para) return "O processo já está nesta etapa.";
  if (autoridade === "API" || autoridade === "ADMIN") return null;

  if (de === "RECEBIDO" || de === "PERDIDO_DECLINADO") {
    return "Só um administrador pode reabrir um processo encerrado.";
  }

  if (para === "PERDIDO_DECLINADO") {
    const ateFechamento = FLUXO.indexOf(de) <= FLUXO.indexOf("FECHADO_CONTRATO");
    if (autoridade === "COMERCIAL" && ateFechamento) return null;
    return "Seu papel não pode marcar este processo como perdido.";
  }

  if (FLUXO.indexOf(para) < FLUXO.indexOf(de)) {
    return "Seu papel só pode avançar o processo na pipeline.";
  }

  if (autoridade === "COMERCIAL") {
    const teto = FLUXO.indexOf("FECHADO_CONTRATO");
    if (FLUXO.indexOf(para) > teto) return "O comercial move o processo até Fechado / Contrato.";
    return null;
  }

  if (autoridade === "OPERACAO") {
    if (de === "FECHADO_CONTRATO" && para === "EM_EXECUCAO") return null;
    if (de === "EM_EXECUCAO" && para === "FINALIZADO") return null;
    return "A operação avança de Fechado / Contrato para Em execução e depois para Finalizado.";
  }

  if (autoridade === "FINANCEIRO") {
    if (de === "FINALIZADO" && para === "CONTAS_A_RECEBER") return null;
    if (de === "CONTAS_A_RECEBER" && para === "RECEBIDO") return null;
    return "O financeiro avança de Finalizado para Contas a receber e depois para Recebido.";
  }

  return "Transição não permitida.";
}

export function destinosPossiveis(autoridade: Autoridade, de: Etapa): Etapa[] {
  return ETAPA_IDS.filter((etapa) => validarTransicao(autoridade, de, etapa) === null);
}
