import { Prisma } from "@prisma/client";
import type { Canal, Etapa, Papel } from "@/lib/domain";
import { rotuloCanal, rotuloEtapa } from "@/lib/domain";
import { dataParaIso, formatarCnpj } from "@/lib/format";

function numero(valor: Prisma.Decimal | null | undefined): number | null {
  if (valor == null) return null;
  return valor.toNumber();
}

const processoComRelacoes = Prisma.validator<Prisma.ProcessoDefaultArgs>()({
  include: {
    cliente: { select: { id: true, nome: true, cnpj: true } },
    contato: { select: { id: true, nome: true, email: true, telefone: true, cargo: true, cpf: true, documento: true } },
    responsavel: { select: { id: true, nome: true, email: true, papel: true } },
  },
});

export type ProcessoRegistro = Prisma.ProcessoGetPayload<typeof processoComRelacoes>;

export const includeProcesso = processoComRelacoes.include;

export type EventoDTO = {
  id: string;
  tipo: "CRIACAO" | "MUDANCA_ETAPA" | "NOTA" | "ATUALIZACAO" | "ANEXO";
  mensagem: string;
  etapaDe: Etapa | null;
  etapaPara: Etapa | null;
  autor: string;
  criadoEm: string;
};

export type AnexoDTO = {
  id: string;
  nomeArquivo: string;
  tipoMime: string;
  tamanho: number;
  autor: string | null;
  criadoEm: string;
};

export type ProcessoDTO = {
  id: string;
  codigo: string;
  titulo: string;
  etapa: Etapa;
  etapaRotulo: string;
  canal: Canal;
  canalRotulo: string;
  cliente: { id: string; nome: string; cnpj: string | null; cnpjFormatado: string };
  contato: {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    cargo: string | null;
    cpf: string | null;
    documento: string | null;
  } | null;
  colaborador: string | null;
  origem: { endereco: string | null; cidade: string | null; uf: string | null; referencia: string | null; andar: string | null; elevador: string | null; imovel: string | null };
  destino: { endereco: string | null; cidade: string | null; uf: string | null; referencia: string | null; andar: string | null; elevador: string | null; imovel: string | null };
  modalidade: string | null;
  descricaoColeta: string | null;
  descricaoEntrega: string | null;
  embalagemNecessaria: boolean | null;
  volume: string | null;
  itensEspeciais: string | null;
  dataPretendida: string | null;
  dataColeta: string | null;
  dataEntrega: string | null;
  dataPrevista: string | null;
  dataEmissao: string | null;
  diasParaColetar: number | null;
  diasParaViagem: number | null;
  motorista: { nome: string | null; placa: string | null; antt: string | null; cnh: string | null; cpf: string | null };
  inventario: string | null;
  valorCotado: number | null;
  valorAprovado: number | null;
  valorFrete: number | null;
  valorSeguro: number | null;
  valorTransporte: number | null;
  valorTotal: number | null;
  formaPagamento: string | null;
  validadeProposta: string | null;
  links: { proposta: string | null; contrato: string | null; contratoCarreteiro: string | null; os: string | null; recibo: string | null };
  marketing: {
    fonte: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmContent: string | null;
    fbclid: string | null;
    gclid: string | null;
    metaCampaignId: string | null;
    metaAdId: string | null;
    referrer: string | null;
    formulario: string | null;
  };
  extras: unknown;
  numeroOc: string | null;
  numeroCte: string | null;
  numeroNf: string | null;
  dataVencimento: string | null;
  dataRecebimento: string | null;
  responsavel: { id: string; nome: string; email: string; papel: Papel } | null;
  exemplo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  eventos?: EventoDTO[];
  anexos?: AnexoDTO[];
};

export function serializarProcesso(
  processo: ProcessoRegistro,
  extras?: { eventos?: EventoDTO[]; anexos?: AnexoDTO[] },
): ProcessoDTO {
  return {
    id: processo.id,
    codigo: processo.codigo,
    titulo: processo.titulo,
    etapa: processo.etapa,
    etapaRotulo: rotuloEtapa(processo.etapa),
    canal: processo.canal,
    canalRotulo: rotuloCanal(processo.canal),
    cliente: {
      id: processo.cliente.id,
      nome: processo.cliente.nome,
      cnpj: processo.cliente.cnpj,
      cnpjFormatado: formatarCnpj(processo.cliente.cnpj),
    },
    contato: processo.contato,
    colaborador: processo.colaborador,
    origem: {
      endereco: processo.origemEndereco,
      cidade: processo.origemCidade,
      uf: processo.origemUf,
      referencia: processo.origemReferencia,
      andar: processo.origemAndar,
      elevador: processo.origemElevador,
      imovel: processo.origemImovel,
    },
    destino: {
      endereco: processo.destinoEndereco,
      cidade: processo.destinoCidade,
      uf: processo.destinoUf,
      referencia: processo.destinoReferencia,
      andar: processo.destinoAndar,
      elevador: processo.destinoElevador,
      imovel: processo.destinoImovel,
    },
    modalidade: processo.modalidade,
    descricaoColeta: processo.descricaoColeta,
    descricaoEntrega: processo.descricaoEntrega,
    embalagemNecessaria: processo.embalagemNecessaria,
    volume: processo.volume,
    itensEspeciais: processo.itensEspeciais,
    dataPretendida: dataParaIso(processo.dataPretendida),
    dataColeta: dataParaIso(processo.dataColeta),
    dataEntrega: dataParaIso(processo.dataEntrega),
    dataPrevista: dataParaIso(processo.dataPrevista),
    dataEmissao: dataParaIso(processo.dataEmissao),
    diasParaColetar: processo.diasParaColetar,
    diasParaViagem: processo.diasParaViagem,
    motorista: {
      nome: processo.motoristaNome,
      placa: processo.motoristaPlaca,
      antt: processo.motoristaAntt,
      cnh: processo.motoristaCnh,
      cpf: processo.motoristaCpf,
    },
    inventario: processo.inventario,
    valorCotado: numero(processo.valorCotado),
    valorAprovado: numero(processo.valorAprovado),
    valorFrete: numero(processo.valorFrete),
    valorSeguro: numero(processo.valorSeguro),
    valorTransporte: numero(processo.valorTransporte),
    valorTotal: numero(processo.valorTotal),
    formaPagamento: processo.formaPagamento,
    validadeProposta: dataParaIso(processo.validadeProposta),
    links: {
      proposta: processo.linkProposta,
      contrato: processo.linkContrato,
      contratoCarreteiro: processo.linkContratoCarreteiro,
      os: processo.linkOs,
      recibo: processo.linkRecibo,
    },
    marketing: {
      fonte: processo.fonte,
      utmSource: processo.utmSource,
      utmMedium: processo.utmMedium,
      utmCampaign: processo.utmCampaign,
      utmTerm: processo.utmTerm,
      utmContent: processo.utmContent,
      fbclid: processo.fbclid,
      gclid: processo.gclid,
      metaCampaignId: processo.metaCampaignId,
      metaAdId: processo.metaAdId,
      referrer: processo.referrer,
      formulario: processo.formulario,
    },
    extras: processo.extras,
    numeroOc: processo.numeroOc,
    numeroCte: processo.numeroCte,
    numeroNf: processo.numeroNf,
    dataVencimento: dataParaIso(processo.dataVencimento),
    dataRecebimento: dataParaIso(processo.dataRecebimento),
    responsavel: processo.responsavel,
    exemplo: processo.exemplo,
    criadoEm: processo.criadoEm.toISOString(),
    atualizadoEm: processo.atualizadoEm.toISOString(),
    eventos: extras?.eventos,
    anexos: extras?.anexos,
  };
}
