"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { adicionarItens, removerItem } from "@/server/inventario";
import { emitirCte } from "@/server/cte/cte";
import { criarTarefa } from "@/server/tarefas";
import { exigirUsuario } from "@/server/session";

function instante(valor: string) {
  const texto = valor.trim();
  const brasileiro = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (brasileiro) {
    return new Date(
      `${brasileiro[3]}-${brasileiro[2]}-${brasileiro[1]}T${brasileiro[4] ?? "09"}:${brasileiro[5] ?? "00"}:00-03:00`,
    );
  }
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

export async function criarTarefaAction(form: FormData) {
  const usuario = await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const vencimento = instante(String(form.get("vencimento") || ""));
  if (!vencimento) redirect(`/processos/${processoId}?aba=tarefas`);
  try {
    await criarTarefa({
      processoId,
      tipoId: String(form.get("tipoId") || ""),
      titulo: String(form.get("titulo") || "").trim(),
      responsavelId: String(form.get("responsavelId") || usuario.id),
      vencimento,
      descricao: String(form.get("descricao") || "") || null,
    });
  } catch (erro) {
    unstable_rethrow(erro);
    if (!(erro instanceof AppError)) throw erro;
  }
  revalidatePath("/tarefas");
  redirect(`/processos/${processoId}?aba=tarefas`);
}

export async function concluirTarefaAction(form: FormData) {
  await exigirUsuario();
  const id = String(form.get("id") || "");
  const tarefa = await prisma.tarefa.update({
    where: { id },
    data: { concluidaEm: new Date() },
  });
  revalidatePath("/tarefas");
  revalidatePath(`/processos/${tarefa.processoId}`);
}

export async function adicionarInventarioAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  const catalogoId = String(form.get("catalogoId") || "");
  const nome = String(form.get("nome") || "");
  try {
    await adicionarItens(processoId, [
      {
        catalogoId: catalogoId || null,
        nome,
        volumeM3: form.get("volumeM3") ? Number(String(form.get("volumeM3")).replace(",", ".")) : null,
        comodo: String(form.get("comodo") || "SALA"),
        quantidade: Number(form.get("quantidade") || 1),
        fragil: form.get("fragil") === "on",
        desmontagem: form.get("desmontagem") === "on",
        embalagem: form.get("embalagem") === "on",
      },
    ]);
  } catch (erro) {
    unstable_rethrow(erro);
    if (!(erro instanceof AppError)) throw erro;
  }
  revalidatePath(`/processos/${processoId}`);
  redirect(`/processos/${processoId}?aba=inventario`);
}

export async function removerInventarioAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  await removerItem(processoId, String(form.get("itemId") || ""));
  revalidatePath(`/processos/${processoId}`);
}

export async function atualizarCatalogoAction(form: FormData) {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return;
  const volume = Number(String(form.get("volumeM3") || "").replace(",", "."));
  if (!Number.isFinite(volume) || volume < 0) return;
  await prisma.itemCatalogo.update({
    where: { id: String(form.get("id") || "") },
    data: { volumeM3: volume, ativo: form.get("ativo") !== "off" },
  });
  revalidatePath("/inventario");
}

export async function atualizarRegraTarefaAction(form: FormData) {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return;
  const horas = Number(form.get("horasDepois"));
  await prisma.regraTarefa.update({
    where: { id: String(form.get("id") || "") },
    data: {
      ativa: form.get("ativa") === "on",
      horasDepois: Number.isFinite(horas) && horas >= 0 ? Math.round(horas) : 24,
      titulo: String(form.get("titulo") || "").trim() || "Tarefa",
    },
  });
  revalidatePath("/tarefas");
}

export async function emitirCteAction(form: FormData) {
  await exigirUsuario();
  const processoId = String(form.get("processoId") || "");
  try {
    await emitirCte(processoId);
  } catch (erro) {
    unstable_rethrow(erro);
    const mensagem = erro instanceof AppError ? erro.message : "Falha ao emitir o CT-e.";
    redirect(`/processos/${processoId}?aba=cte&aviso=${encodeURIComponent(mensagem)}`);
  }
  revalidatePath(`/processos/${processoId}`);
  redirect(`/processos/${processoId}?aba=cte`);
}
