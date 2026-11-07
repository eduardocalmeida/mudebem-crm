"use server";

import { revalidatePath } from "next/cache";
import type { EstadoForm } from "@/lib/estado";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { slugDaEtapa } from "@/server/etapas";
import { importarPlanilha, type TipoPlanilha } from "@/server/importacao";
import { atorDoUsuario, exigirUsuario } from "@/server/session";

function falha(erro: unknown, reserva: string): EstadoForm {
  if (erro instanceof AppError) return { erro: erro.message };
  console.error(erro);
  return { erro: reserva };
}

export async function importarCsvAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm & { resumo?: string }> {
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador importa a planilha da Kommo.", 403, "PROIBIDO");
    const tipo = String(form.get("tipo") ?? "leads") as TipoPlanilha;
    if (!["leads", "contatos", "empresas"].includes(tipo)) throw new AppError("Tipo de planilha inválido.", 400, "DADOS_INVALIDOS");
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) throw new AppError("Selecione um CSV.", 400, "DADOS_INVALIDOS");
    if (arquivo.size > 8 * 1024 * 1024) throw new AppError("O CSV deve ter no máximo 8 MB.", 400, "DADOS_INVALIDOS");
    const texto = await arquivo.text();
    const resultado = await importarPlanilha(tipo, texto, atorDoUsuario(usuario));
    revalidatePath("/processos");
    revalidatePath("/clientes");
    revalidatePath("/painel");
    const erros = resultado.erros.slice(0, 8).join(" ");
    return {
      ok: `Importação concluída: ${resultado.criados} criado(s), ${resultado.atualizados} atualizado(s).${erros ? ` Avisos: ${erros}` : ""}`,
    };
  } catch (erro) {
    return falha(erro, "Não foi possível importar a planilha.");
  }
}

export async function salvarEtapaAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador edita as etapas.", 403, "PROIBIDO");
    const id = String(form.get("id") ?? "").trim();
    const rotulo = String(form.get("rotulo") ?? "").trim();
    const cor = String(form.get("cor") ?? "#1e4d3a").trim();
    const grupo = String(form.get("grupo") ?? "comercial");
    if (rotulo.length < 2) throw new AppError("Informe o nome da etapa.", 400, "DADOS_INVALIDOS");
    if (id) {
      await prisma.etapaPipeline.update({ where: { id }, data: { rotulo, cor, grupo } });
    } else {
      const slugBase = slugDaEtapa(rotulo);
      const maior = await prisma.etapaPipeline.aggregate({ _max: { ordem: true } });
      let slug = slugBase;
      let tentativa = 2;
      while (await prisma.etapaPipeline.findUnique({ where: { slug } })) {
        slug = `${slugBase}_${tentativa}`;
        tentativa += 1;
      }
      await prisma.etapaPipeline.create({
        data: {
          id: slug,
          slug,
          rotulo,
          cor,
          grupo,
          ordem: (maior._max.ordem ?? 0) + 10,
          terminal: grupo === "terminal",
        },
      });
    }
    revalidatePath("/etapas");
    revalidatePath("/processos");
    return { ok: "Etapa salva." };
  } catch (erro) {
    return falha(erro, "Não foi possível salvar a etapa.");
  }
}

export async function moverOrdemEtapaAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador reordena as etapas.", 403, "PROIBIDO");
    const id = String(form.get("id") ?? "");
    const direcao = form.get("direcao") === "cima" ? -1 : 1;
    const etapas = await prisma.etapaPipeline.findMany({ orderBy: { ordem: "asc" } });
    const indice = etapas.findIndex((etapa) => etapa.id === id);
    const vizinho = etapas[indice + direcao];
    const atual = etapas[indice];
    if (!atual || !vizinho) return { ok: "A ordem já está no limite." };
    await prisma.$transaction([
      prisma.etapaPipeline.update({ where: { id: atual.id }, data: { ordem: vizinho.ordem } }),
      prisma.etapaPipeline.update({ where: { id: vizinho.id }, data: { ordem: atual.ordem } }),
    ]);
    revalidatePath("/etapas");
    revalidatePath("/processos");
    return { ok: "Ordem atualizada." };
  } catch (erro) {
    return falha(erro, "Não foi possível reordenar.");
  }
}

export async function alternarEtapaAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador desativa etapas.", 403, "PROIBIDO");
    const id = String(form.get("id") ?? "");
    const etapa = await prisma.etapaPipeline.findUnique({ where: { id } });
    if (!etapa) throw new AppError("Etapa não encontrada.", 404, "NAO_ENCONTRADO");
    await prisma.etapaPipeline.update({ where: { id }, data: { ativa: !etapa.ativa } });
    revalidatePath("/etapas");
    revalidatePath("/processos");
    return { ok: etapa.ativa ? "Etapa desativada." : "Etapa reativada." };
  } catch (erro) {
    return falha(erro, "Não foi possível atualizar a etapa.");
  }
}
