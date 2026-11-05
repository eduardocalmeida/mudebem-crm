import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { obterProvedorCte } from "@/server/cte/provedor";

export async function obterOuPreencherCte(processoId: string) {
  const existente = await prisma.cte.findUnique({ where: { processoId } });
  if (existente) return existente;
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    include: { cliente: true, contato: true },
  });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  const volume = Number(String(processo.volume ?? "").replace(",", "."));
  return prisma.cte.create({
    data: {
      processoId,
      status: "RASCUNHO",
      remetenteNome: processo.cliente.nome,
      remetenteDocumento: processo.cliente.cnpj,
      remetenteMunicipio: processo.origemCidade,
      remetenteUf: processo.origemUf,
      destinatarioNome: processo.contato?.nome || processo.cliente.nome,
      destinatarioDocumento: processo.cliente.cnpj,
      destinatarioMunicipio: processo.destinoCidade,
      destinatarioUf: processo.destinoUf,
      tomador: "REMETENTE",
      naturezaOperacao: "Prestação de serviço de transporte de mudança",
      modal: "01",
      municipioInicio: processo.origemCidade,
      ufInicio: processo.origemUf,
      municipioFim: processo.destinoCidade,
      ufFim: processo.destinoUf,
      valorPrestacao: processo.valorTotal ?? processo.valorAprovado ?? processo.valorFrete,
      produtoPredominante: "Móveis e utensílios domésticos",
      valorCarga: processo.valorTotal ?? processo.valorAprovado,
      quantidadeCarga: Number.isFinite(volume) && volume > 0 ? volume : null,
      unidadeCarga: "M3",
      rntrc: processo.motoristaAntt,
      documentos: processo.numeroNf ? [{ tipo: "NFE", numero: processo.numeroNf }] : [],
      componentes: processo.valorFrete ? [{ nome: "Frete", valor: Number(processo.valorFrete) }] : [],
    },
  });
}

export async function emitirCte(processoId: string) {
  const cte = await obterOuPreencherCte(processoId);
  const provedor = obterProvedorCte();
  const resultado = await provedor.emitir(cte.id);
  return prisma.cte.update({
    where: { id: cte.id },
    data: {
      status: resultado.status,
      chave: resultado.chave,
      numero: resultado.numero,
      serie: resultado.serie,
      xmlUrl: resultado.xmlUrl,
      dacteUrl: resultado.dacteUrl,
      provedor: provedor.nome,
    },
  });
}
