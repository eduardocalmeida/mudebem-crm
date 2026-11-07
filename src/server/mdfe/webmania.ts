import { AppError } from "@/lib/errors";
import type { PedidoHttpCte, ProvedorMdfe, RascunhoMdfe } from "@/server/cte/contrato";
import { ambienteWebmania, tokenConfigurado } from "@/server/cte/webmania";

const URL_BASE = () => (process.env.WEBMANIA_URL_BASE || "https://api.webmania.com.br").replace(/\/$/, "");

function digitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
}

function placa(valor: string | null) {
  return (valor ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function montarPayloadMdfe(rascunho: RascunhoMdfe, ambiente = ambienteWebmania()) {
  const pendencias: string[] = [];
  if (!rascunho.ufInicio) pendencias.push("Informe a UF de início.");
  if (!rascunho.ufFim) pendencias.push("Informe a UF de fim.");
  if (rascunho.carregamento.length === 0) pendencias.push("Informe o município de carregamento.");
  if (rascunho.descarregamento.length === 0) pendencias.push("Informe o município de descarregamento.");
  const semChave = rascunho.descarregamento.some((municipio) => municipio.chaves.length === 0);
  if (semChave) pendencias.push("Cada descarregamento precisa da chave de um CT-e autorizado.");
  const placaLimpa = placa(rascunho.placa);
  if (placaLimpa.length !== 7) pendencias.push("A placa precisa ter 7 caracteres.");
  const cpf = digitos(rascunho.condutorCpf);
  if (!rascunho.condutorNome?.trim() || cpf.length !== 11) pendencias.push("Informe o condutor com nome e CPF.");
  const rntrc = digitos(rascunho.rntrc);
  if (rntrc.length !== 8) pendencias.push("O RNTRC precisa ter 8 dígitos.");
  if (rascunho.pesoBruto == null) pendencias.push("O peso bruto não é calculado a partir do m³. Informe em kg se estiver medido.");

  const veiculo: Record<string, unknown> = {
    placa: placaLimpa,
    uf_licenciamento: rascunho.ufInicio,
    tipo_rodado: "06",
    tipo_carroceria: "00",
  };
  const renavam = digitos(rascunho.renavam);
  if (renavam) veiculo.renavam = renavam;
  if (rascunho.taraKg != null) veiculo.tara = String(rascunho.taraKg);
  if (rascunho.capacidadeKg != null) veiculo.capacidade_kg = String(rascunho.capacidadeKg);
  if (rascunho.capacidadeM3 != null) veiculo.capacidade_m3 = String(rascunho.capacidadeM3);

  const payload: Record<string, unknown> = {
    ambiente,
    modalidade: 1,
    emitente: 1,
    transportador: 1,
    uf_carregamento: rascunho.ufInicio,
    uf_descarregamento: rascunho.ufFim,
    carregamento: rascunho.carregamento.map((municipio) => ({ nome_municipio: municipio.nome })),
    descarregamento: rascunho.descarregamento.map((municipio) => ({
      nome_municipio: municipio.nome,
      documentos_fiscais: municipio.chaves.map((chave) => ({ chave })),
    })),
    rodoviario: {
      rntrc,
      veiculo_tracao: veiculo,
      condutor: [{ nome: rascunho.condutorNome?.trim(), cpf }],
    },
  };
  if (rascunho.percurso.length > 0) payload.percurso = rascunho.percurso;
  if (rascunho.valorCarga != null) payload.valor_carga = rascunho.valorCarga.toFixed(2);
  if (rascunho.pesoBruto != null) {
    payload.unidade = "01";
    payload.peso_bruto = rascunho.pesoBruto.toFixed(4);
  }
  if (rascunho.seguradoraNome || rascunho.apolice) {
    payload.seguro = [
      {
        responsavel: { tipo_responsavel: 1 },
        ...(rascunho.seguradoraNome
          ? {
              seguradora: {
                nome_seguradora: rascunho.seguradoraNome,
                ...(digitos(rascunho.seguradoraCnpj).length === 14 ? { cnpj: digitos(rascunho.seguradoraCnpj) } : {}),
              },
            }
          : {}),
        ...(rascunho.apolice ? { numero_apolice: rascunho.apolice } : {}),
        ...(rascunho.averbacoes.length > 0 ? { numero_averbacao: rascunho.averbacoes } : {}),
      },
    ];
  }
  const aviso = process.env.WEBMANIA_MDFE_URL_NOTIFICACAO?.trim();
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
      "Defina WEBMANIA_ACCESS_TOKEN. Use WEBMANIA_AMBIENTE=2 para homologação. O certificado A1 fica no painel da WebmaniaBR, não neste CRM. Nenhum MDF-e foi enviado.",
      501,
      "PROVEDOR_AUSENTE",
    );
  }
}

function adiar(texto: string): never {
  throw new AppError(texto, 501, "EMISSAO_ADIADA");
}

export class ProvedorWebmaniaMdfe implements ProvedorMdfe {
  readonly nome = "webmania";

  prepararEmissao(rascunho: RascunhoMdfe) {
    const montado = montarPayloadMdfe(rascunho);
    return pedido("POST", "/2/mdfe/emissao", montado.payload, montado.pendencias);
  }

  async emitir(rascunho: RascunhoMdfe) {
    exigirToken();
    const montado = this.prepararEmissao(rascunho);
    if (montado.pendencias.length > 0) throw new AppError(montado.pendencias.join(" "), 400, "DADOS_INVALIDOS");
    adiar("Pedido de MDF-e montado para a WebmaniaBR. Este esqueleto não envia a requisição.");
  }

  prepararEncerramento(chave: string, uf: string, municipio: string) {
    const pendencias = !uf || !municipio ? ["Informe a UF e o município de encerramento."] : [];
    return pedido("PUT", "/2/mdfe/encerrar", { chave, uf, municipio }, pendencias);
  }

  async encerrar(chave: string, uf: string, municipio: string) {
    exigirToken();
    const montado = this.prepararEncerramento(chave, uf, municipio);
    if (montado.pendencias.length > 0) throw new AppError(montado.pendencias.join(" "), 400, "DADOS_INVALIDOS");
    adiar("Encerramento montado (PUT /2/mdfe/encerrar). Nada foi enviado à SEFAZ.");
  }

  prepararCancelamento(chave: string, justificativa: string) {
    const pendencias = justificativa.trim().length < 15 ? ["A justificativa precisa de 15 a 255 caracteres."] : [];
    return pedido("PUT", "/2/mdfe/cancelar", { chave, justificativa }, pendencias);
  }

  async cancelar(chave: string, justificativa: string) {
    exigirToken();
    const montado = this.prepararCancelamento(chave, justificativa);
    if (montado.pendencias.length > 0) throw new AppError(montado.pendencias.join(" "), 400, "DADOS_INVALIDOS");
    adiar("Cancelamento do MDF-e montado (PUT /2/mdfe/cancelar). Nada foi enviado à SEFAZ.");
  }
}
