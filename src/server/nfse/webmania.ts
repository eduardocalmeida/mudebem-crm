import { AppError } from "@/lib/errors";
import type { PedidoHttpCte } from "@/server/cte/contrato";
import { ambienteWebmania, tokenConfigurado } from "@/server/cte/webmania";

const URL_BASE = () => (process.env.WEBMANIA_URL_BASE || "https://api.webmania.com.br").replace(/\/$/, "");

export type RascunhoNfse = {
  prestadorMunicipio: string | null;
  prestadorUf: string | null;
  prestadorIbge: string | null;
  tomadorNome: string | null;
  tomadorDocumento: string | null;
  tomadorEmail: string | null;
  tomadorEndereco: string | null;
  tomadorNumero: string | null;
  tomadorBairro: string | null;
  tomadorCidade: string | null;
  tomadorUf: string | null;
  tomadorCep: string | null;
  municipioPrestacao: string | null;
  discriminacao: string | null;
  codigoServico: string | null;
  cnae: string | null;
  aliquotaIss: number | null;
  issRetido: boolean;
  aliquotaPis: number | null;
  aliquotaCofins: number | null;
  aliquotaCsll: number | null;
  aliquotaIr: number | null;
  aliquotaInss: number | null;
  valorServicos: number | null;
  deducoes: number | null;
  ibsSituacao: string | null;
  ibsClassificacao: string | null;
};

function digitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
}

function aliquota(valor: number | null) {
  return valor == null ? undefined : valor.toFixed(2);
}

export function padraoNacional() {
  return process.env.WEBMANIA_NFSE_MODELO === "padrao_nacional";
}

export function montarPayloadNfse(rascunho: RascunhoNfse, ambiente = ambienteWebmania()) {
  const pendencias: string[] = [];
  if (rascunho.valorServicos == null) pendencias.push("Informe o valor dos serviços.");
  if (!rascunho.discriminacao?.trim()) pendencias.push("Informe a discriminação do serviço.");
  if (!rascunho.codigoServico) pendencias.push("Escolha o código de serviço da LC 116.");
  if (!rascunho.tomadorNome?.trim() || digitos(rascunho.tomadorDocumento).length < 11) {
    pendencias.push("Informe o tomador com CPF ou CNPJ.");
  }
  if (rascunho.aliquotaIss == null && !padraoNacional()) pendencias.push("Informe a alíquota de ISS do município.");

  const documento = digitos(rascunho.tomadorDocumento);
  const tomador: Record<string, string> = {};
  if (documento.length === 14) {
    tomador.cnpj = documento;
    tomador.razao_social = rascunho.tomadorNome?.trim() || "";
  } else if (documento.length === 11) {
    tomador.cpf = documento;
    tomador.nome_completo = rascunho.tomadorNome?.trim() || "";
  }
  const endereco: [keyof RascunhoNfse, string][] = [
    ["tomadorEndereco", "endereco"],
    ["tomadorNumero", "numero"],
    ["tomadorBairro", "bairro"],
    ["tomadorCidade", "cidade"],
    ["tomadorUf", "uf"],
    ["tomadorEmail", "email"],
  ];
  for (const [origem, destino] of endereco) {
    const valor = rascunho[origem];
    if (typeof valor === "string" && valor.trim()) tomador[destino] = valor.trim();
  }
  const cep = digitos(rascunho.tomadorCep);
  if (cep.length === 8) tomador.cep = cep;

  const impostos: Record<string, unknown> = {};
  if (!padraoNacional() && rascunho.aliquotaIss != null) impostos.iss = aliquota(rascunho.aliquotaIss);
  if (rascunho.aliquotaPis != null) impostos.pis = aliquota(rascunho.aliquotaPis);
  if (rascunho.aliquotaCofins != null) impostos.cofins = aliquota(rascunho.aliquotaCofins);
  if (rascunho.aliquotaCsll != null) impostos.csll = aliquota(rascunho.aliquotaCsll);
  if (rascunho.aliquotaIr != null) impostos.ir = aliquota(rascunho.aliquotaIr);
  if (rascunho.aliquotaInss != null) impostos.inss = aliquota(rascunho.aliquotaInss);
  if (rascunho.ibsSituacao || rascunho.ibsClassificacao) {
    impostos.ibs_cbs = {
      ...(rascunho.ibsSituacao ? { situacao_tributaria: rascunho.ibsSituacao } : {}),
      ...(rascunho.ibsClassificacao ? { classificacao_tributaria: rascunho.ibsClassificacao } : {}),
    };
  }

  const servico: Record<string, unknown> = {
    valor_servicos: (rascunho.valorServicos ?? 0).toFixed(2),
    discriminacao: (rascunho.discriminacao || "").slice(0, 2000),
    iss_retido: rascunho.issRetido ? 1 : 2,
  };
  if (rascunho.codigoServico) servico.codigo_servico = rascunho.codigoServico;
  const cnae = digitos(rascunho.cnae);
  if (cnae) servico.codigo_cnae = cnae;
  if (rascunho.deducoes != null) servico.deducoes = rascunho.deducoes.toFixed(2);
  if (Object.keys(impostos).length > 0) servico.impostos = impostos;

  const payload: Record<string, unknown> = {
    ambiente,
    rps: [{ servico, tomador }],
  };
  const aviso = process.env.WEBMANIA_NFSE_URL_NOTIFICACAO?.trim();
  if (aviso) payload.url_notificacao = aviso;
  return { payload, pendencias };
}

function pedido(metodo: PedidoHttpCte["metodo"], caminho: string, corpo: Record<string, unknown>, pendencias: string[]): PedidoHttpCte {
  return {
    metodo,
    url: `${URL_BASE()}${caminho}`,
    cabecalhos: {
      Authorization: "Bearer [WEBMANIA_ACCESS_TOKEN]",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    corpo,
    pendencias,
    enviado: false,
  };
}

function exigirToken() {
  if (!tokenConfigurado()) {
    throw new AppError(
      "Defina WEBMANIA_ACCESS_TOKEN. Use WEBMANIA_AMBIENTE=2 para homologação. O certificado A1 fica no painel da WebmaniaBR. Nenhuma NFS-e foi enviada.",
      501,
      "PROVEDOR_AUSENTE",
    );
  }
}

export interface ProvedorNfse {
  readonly nome: string;
  prepararEmissao(rascunho: RascunhoNfse): PedidoHttpCte;
  emitir(rascunho: RascunhoNfse): Promise<void>;
  prepararCancelamento(uuid: string, motivo: number): PedidoHttpCte;
  cancelar(uuid: string, motivo: number): Promise<void>;
}

export class ProvedorWebmaniaNfse implements ProvedorNfse {
  readonly nome = "webmania";

  prepararEmissao(rascunho: RascunhoNfse) {
    const montado = montarPayloadNfse(rascunho);
    return pedido("POST", "/2/nfse/emissao", montado.payload, montado.pendencias);
  }

  async emitir(rascunho: RascunhoNfse) {
    exigirToken();
    const montado = this.prepararEmissao(rascunho);
    if (montado.pendencias.length > 0) throw new AppError(montado.pendencias.join(" "), 400, "DADOS_INVALIDOS");
    throw new AppError("Pedido de NFS-e montado para a WebmaniaBR. Este esqueleto não envia a requisição.", 501, "EMISSAO_ADIADA");
  }

  prepararCancelamento(uuid: string, motivo: number) {
    const pendencias = [1, 2, 4].includes(motivo) ? [] : ["O motivo do cancelamento é 1, 2 ou 4."];
    return pedido("PUT", "/2/nfse/cancelar", { uuid, motivo }, pendencias);
  }

  async cancelar(uuid: string, motivo: number) {
    exigirToken();
    const montado = this.prepararCancelamento(uuid, motivo);
    if (montado.pendencias.length > 0) throw new AppError(montado.pendencias.join(" "), 400, "DADOS_INVALIDOS");
    throw new AppError("Cancelamento da NFS-e montado (PUT /2/nfse/cancelar). Nada foi enviado à prefeitura.", 501, "EMISSAO_ADIADA");
  }
}

export function obterProvedorNfse(): ProvedorNfse {
  return new ProvedorWebmaniaNfse();
}
