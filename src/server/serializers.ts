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
    contato: { select: { id: true, nome: true, email: true, telefone: true, cargo: true } },
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
  } | null;
  colaborador: string | null;
  origem: { endereco: string | null; cidade: string | null; uf: string | null };
  destino: { endereco: string | null; cidade: string | null; uf: string | null };
  dataColeta: string | null;
  dataEntrega: string | null;
  inventario: string | null;
  valorCotado: number | null;
  valorAprovado: number | null;
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
    },
    destino: {
      endereco: processo.destinoEndereco,
      cidade: processo.destinoCidade,
      uf: processo.destinoUf,
    },
    dataColeta: dataParaIso(processo.dataColeta),
    dataEntrega: dataParaIso(processo.dataEntrega),
    inventario: processo.inventario,
    valorCotado: numero(processo.valorCotado),
    valorAprovado: numero(processo.valorAprovado),
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
