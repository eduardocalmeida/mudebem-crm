import { AppError } from "@/lib/errors";
import type { PedidoHttpCte, ProvedorCte } from "@/server/cte/contrato";
import { MODAIS } from "@/server/cte/opcoes";
import type { AtorCte, RascunhoCte } from "@/server/cte/rascunho";

const URL_BASE = () => (process.env.WEBMANIA_URL_BASE || "https://api.webmania.com.br").replace(/\/$/, "");

export function ambienteWebmania(): 1 | 2 {
  return process.env.WEBMANIA_AMBIENTE === "1" ? 1 : 2;
}

export function tokenConfigurado() {
  return Boolean(process.env.WEBMANIA_ACCESS_TOKEN?.trim());
}

function digitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
}

function dinheiro(valor: number | null | undefined) {
  if (valor == null || Number.isNaN(valor)) return undefined;
  return Math.round(valor * 100) / 100;
}

function ator(pessoa: AtorCte | null | undefined) {
  if (!pessoa?.nome?.trim()) return undefined;
  const documento = digitos(pessoa.documento);
  const cep = digitos(pessoa.cep);
  const corpo: Record<string, string> = { nome_razao: pessoa.nome.trim().slice(0, 60) };
  if (documento.length === 14) corpo.cnpj = documento;
  if (documento.length === 11) corpo.cpf = documento;
  const pares: [keyof AtorCte, string][] = [
    ["ie", "ie"],
    ["email", "email"],
    ["endereco", "endereco"],
    ["numero", "numero"],
    ["complemento", "complemento"],
    ["bairro", "bairro"],
    ["cidade", "cidade"],
    ["uf", "uf"],
  ];
  for (const [origem, destino] of pares) {
    const valor = pessoa[origem];
    if (typeof valor === "string" && valor.trim()) corpo[destino] = valor.trim();
  }
  const telefone = digitos(pessoa.telefone);
  if (telefone.length >= 6) corpo.telefone = telefone.slice(0, 14);
  if (cep.length === 8) corpo.cep = cep;
  return corpo;
}

export function montarPayloadWebmania(rascunho: RascunhoCte, ambiente = ambienteWebmania()) {
  const pendencias: string[] = [];
  const modal = MODAIS.find((item) => item.id === rascunho.modal) ?? MODAIS[0];
  const servico: Record<string, unknown> = { tipo: rascunho.tipoServico };
  const valor = dinheiro(rascunho.valorServico);
  if (valor == null) pendencias.push("Informe o valor do serviço, a partir do valor aprovado.");
  else {
    servico.valor_total = valor;
    servico.valor_recebido = dinheiro(rascunho.valorReceber) ?? valor;
  }
  if (rascunho.componentes.length > 0) {
    servico.componentes = Object.fromEntries(
      rascunho.componentes.filter((item) => item.nome.trim()).map((item) => [item.nome.trim(), item.valor]),
    );
  }

  const carga: Record<string, unknown> = {
    produto_predominante: (rascunho.produtoPredominante || "Móveis e utensílios domésticos").slice(0, 60),
  };
  const mercadoria = dinheiro(rascunho.valorMercadoria);
  if (mercadoria == null) pendencias.push("Informe o valor da mercadoria. O frete não substitui o valor da carga.");
  else carga.valor_total = mercadoria;
  if (rascunho.caracteristicas?.trim()) carga.caracteristicas = rascunho.caracteristicas.trim().slice(0, 30);
  if (rascunho.cubagemM3 && rascunho.cubagemM3 > 0) {
    carga.quantidades = [
      {
        quantidade: Math.round(rascunho.cubagemM3 * 1000) / 1000,
        unidade_medida: 0,
        tipo_medida: "CUBAGEM",
      },
    ];
  } else pendencias.push("Calcule a cubagem em m³ pelo inventário.");

  const payload: Record<string, unknown> = {
    ambiente,
    modelo: "cte",
    modalidade: modal.webmania,
    finalidade: rascunho.finalidade,
    contribuicao_tomador: rascunho.contribuicaoTomador,
    indicador_tomador: rascunho.indicadorTomador,
    servico,
    carga,
    local_inicio_prestacao: { cidade: rascunho.inicioCidade, uf: rascunho.inicioUf },
    local_termino_prestacao: { cidade: rascunho.fimCidade, uf: rascunho.fimUf },
  };
  const aviso = process.env.WEBMANIA_URL_NOTIFICACAO?.trim();
  if (aviso) payload.url_notificacao = aviso;
  if (rascunho.finalidade === 1 || rascunho.finalidade === 3) {
    pendencias.push("Complemento ou substituição exigem a chave do CT-e referenciado.");
  }

  const remetente = ator(rascunho.remetente);
  const destinatario = ator(rascunho.destinatario);
  if (remetente) payload.remetente = remetente;
  else pendencias.push("Informe o remetente.");
  if (destinatario) payload.destinatario = destinatario;
  else pendencias.push("Informe o destinatário.");
  const expedidor = ator(rascunho.expedidor);
  const recebedor = ator(rascunho.recebedor);
  if (expedidor) payload.expedidor = expedidor;
  if (recebedor) payload.recebedor = recebedor;
  if (rascunho.indicadorTomador === 4) {
    const tomador = ator(rascunho.tomador);
    if (tomador) payload.tomador = tomador;
    else pendencias.push("Com tomador Outro, informe o tomador.");
  }

  if (rascunho.documentos.length > 0) {
    payload.documentos_fiscais = rascunho.documentos.map((documento) => ({
      tipo: documento.tipo,
      ...(documento.chave ? { chave: digitos(documento.chave) } : {}),
      ...(documento.numero ? { numero: documento.numero } : {}),
    }));
  } else pendencias.push("Vincule a NF-e ou a declaração. O inventário não substitui o documento fiscal.");

  const classificacao = rascunho.situacaoIcms === "OU" ? "90" : rascunho.situacaoIcms;
  const icms: Record<string, unknown> = {};
  if (rascunho.aliquotaIcms != null) icms.aliquota = rascunho.aliquotaIcms;
  if (rascunho.reducaoBase != null) icms.percentual_reducao = rascunho.reducaoBase;
  if (rascunho.situacaoIcms === "OU") icms.devido_origem = true;
  const ibs: Record<string, unknown> = {};
  if (rascunho.ibsSituacao) ibs.situacao_tributaria = rascunho.ibsSituacao;
  if (rascunho.ibsClassificacao) ibs.classificacao_tributaria = rascunho.ibsClassificacao;
  payload.impostos = {
    ...(rascunho.cfop ? { cfop: rascunho.cfop } : {}),
    ...(classificacao ? { classificacao_tributaria: classificacao } : {}),
    ...(rascunho.beneficioFiscal ? { beneficio_fiscal: rascunho.beneficioFiscal } : {}),
    ...(Object.keys(icms).length > 0 ? { icms } : {}),
    ...(Object.keys(ibs).length > 0 ? { ibs_cbs: ibs } : {}),
  };
  if (!rascunho.cfop) pendencias.push("Escolha o CFOP.");

  const rntrc = digitos(rascunho.rntrc);
  if (rntrc.length === 8) payload.rodoviario = { rntrc };
  else pendencias.push("O RNTRC da ANTT precisa ter 8 dígitos.");
  if (rascunho.observacoes?.trim()) payload.observacoes_gerais = rascunho.observacoes.trim().slice(0, 2000);
  return { payload, pendencias };
}

function pedido(metodo: PedidoHttpCte["metodo"], caminho: string, corpo: Record<string, unknown> | null, pendencias: string[]): PedidoHttpCte {
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
      "Defina WEBMANIA_ACCESS_TOKEN. Use WEBMANIA_AMBIENTE=2 para homologação. Nenhum CT-e foi enviado.",
      501,
      "PROVEDOR_AUSENTE",
    );
  }
}

function adiar(texto: string): never {
  throw new AppError(texto, 501, "EMISSAO_ADIADA");
}

export class ProvedorWebmania implements ProvedorCte {
  readonly nome = "webmania";

  prepararEmissao(rascunho: RascunhoCte) {
    const montado = montarPayloadWebmania(rascunho);
    return pedido("POST", "/2/cte/emissao", montado.payload, montado.pendencias);
  }

  async emitir(rascunho: RascunhoCte) {
    exigirToken();
    const montado = this.prepararEmissao(rascunho);
    if (montado.pendencias.length > 0) throw new AppError(montado.pendencias.join(" "), 400, "DADOS_INVALIDOS");
    adiar("Pedido da WebmaniaBR montado para o ambiente configurado. Este esqueleto não envia a requisição.");
  }

  prepararCancelamento(chave: string, justificativa: string) {
    return pedido("PUT", "/2/cte/cancelar/", { chave, justificativa }, justificativa.trim().length < 15 ? ["A justificativa precisa de 15 a 255 caracteres."] : []);
  }

  async cancelar(chave: string, justificativa: string) {
    exigirToken();
    const montado = this.prepararCancelamento(chave, justificativa);
    if (montado.pendencias.length > 0) throw new AppError(montado.pendencias.join(" "), 400, "DADOS_INVALIDOS");
    adiar("Cancelamento montado (PUT /2/cte/cancelar/). Nada foi enviado à SEFAZ.");
  }

  prepararCartaCorrecao(chave: string, grupo: string, campo: string, valor: string) {
    const pendencias = [grupo, campo, valor].some((item) => !item.trim()) ? ["Informe grupo, campo e valor da correção."] : [];
    return pedido(
      "POST",
      "/2/cte/correcao",
      { chave, alteracoes: [{ grupo, campo, valor }] },
      pendencias,
    );
  }

  async cartaCorrecao(chave: string, grupo: string, campo: string, valor: string) {
    exigirToken();
    const montado = this.prepararCartaCorrecao(chave, grupo, campo, valor);
    if (montado.pendencias.length > 0) throw new AppError(montado.pendencias.join(" "), 400, "DADOS_INVALIDOS");
    adiar("Carta de correção montada (POST /2/cte/correcao). Nada foi enviado à SEFAZ.");
  }
}
