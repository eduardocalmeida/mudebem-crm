"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";
import { gerarChaveApi } from "@/lib/api-key";
import type { EstadoForm } from "@/lib/estado";
import { AppError, mensagemZod } from "@/lib/errors";
import { hashSenha, verificarSenha } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { destinosPossiveis, rotuloEtapa } from "@/lib/domain";
import { esquemaEtapa } from "@/lib/schemas";
import { carregarEtapas } from "@/server/etapas";
import { COOKIE_SESSAO, assinarSessao, opcoesCookie } from "@/lib/token";
import { atualizarCliente, criarCliente, criarContato } from "@/server/clientes";
import {
  lerChave,
  lerCliente,
  lerContato,
  lerCriarProcesso,
  lerEtapa,
  lerNota,
  lerPatchCliente,
  lerPatchProcesso,
  lerUsuario,
} from "@/server/formulario";
import { adicionarNota, atualizarProcesso, criarProcesso, moverEtapa, registrarPosVenda } from "@/server/processos";
import { atorDoUsuario, exigirUsuario } from "@/server/session";

function falha(erro: unknown, reserva: string): EstadoForm {
  unstable_rethrow(erro);
  if (erro instanceof AppError) return { erro: erro.message };
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
    return { erro: "Já existe um registro com esse dado." };
  }
  console.error(erro);
  return { erro: reserva };
}

function atualizarTelas(processoId?: string) {
  revalidatePath("/painel");
  revalidatePath("/processos");
  revalidatePath("/clientes");
  if (processoId) revalidatePath(`/processos/${processoId}`);
}

export async function entrarAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo || !(await verificarSenha(senha, usuario.senhaHash))) {
    return { erro: "E-mail ou senha incorretos." };
  }
  const token = await assinarSessao({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
  });
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, token, opcoesCookie());
  redirect("/painel");
}

export async function sairAction() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
  redirect("/login");
}

export async function criarProcessoAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const usuario = await exigirUsuario();
    const processo = await criarProcesso(atorDoUsuario(usuario), lerCriarProcesso(form, usuario.papel));
    atualizarTelas(processo.id);
    redirect(`/processos/${processo.id}`);
  } catch (erro) {
    return falha(erro, "Não foi possível criar o processo.");
  }
}

export async function salvarProcessoAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("processoId") ?? "");
  try {
    const usuario = await exigirUsuario();
    await atualizarProcesso(atorDoUsuario(usuario), id, lerPatchProcesso(form, usuario.papel));
    atualizarTelas(id);
    return { ok: "Processo atualizado." };
  } catch (erro) {
    return falha(erro, "Não foi possível salvar o processo.");
  }
}

export async function moverEtapaAction(
  processoId: string,
  etapa: string,
): Promise<{ ok: true; etapa: string; rotulo: string; destinos: { id: string; rotulo: string }[] } | { ok: false; erro: string }> {
  try {
    const usuario = await exigirUsuario();
    const resultado = esquemaEtapa.safeParse({ etapa });
    if (!resultado.success) throw new AppError(mensagemZod(resultado.error), 400, "DADOS_INVALIDOS");
    await moverEtapa(atorDoUsuario(usuario), processoId, resultado.data.etapa);
    atualizarTelas(processoId);
    const etapas = await carregarEtapas();
    const atual = resultado.data.etapa;
    return {
      ok: true as const,
      etapa: atual,
      rotulo: rotuloEtapa(atual, etapas),
      destinos: destinosPossiveis(usuario.papel, atual, etapas).map((id) => ({ id, rotulo: rotuloEtapa(id, etapas) })),
    };
  } catch (erro) {
    unstable_rethrow(erro);
    if (erro instanceof AppError) return { ok: false, erro: erro.message };
    console.error(erro);
    return { ok: false, erro: "Não foi possível mover o processo." };
  }
}

export async function mudarEtapaAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("processoId") ?? "");
  try {
    const usuario = await exigirUsuario();
    const dados = lerEtapa(form);
    await moverEtapa(atorDoUsuario(usuario), id, dados.etapa, dados.observacao);
    atualizarTelas(id);
    return { ok: "Etapa atualizada." };
  } catch (erro) {
    return falha(erro, "Não foi possível mover a etapa.");
  }
}

export async function marcarPerdidoAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("processoId") ?? "");
  try {
    const usuario = await exigirUsuario();
    await moverEtapa(atorDoUsuario(usuario), id, "PERDIDO", null, {
      codigo: String(form.get("motivoPerda") ?? ""),
      detalhe: String(form.get("detalhe") ?? ""),
    });
    atualizarTelas(id);
    return { ok: "Oportunidade marcada como perdida." };
  } catch (erro) {
    return falha(erro, "Não foi possível marcar a perda.");
  }
}

export async function salvarPosVendaAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("processoId") ?? "");
  try {
    const usuario = await exigirUsuario();
    const bruto = String(form.get("nota") ?? "").trim();
    const nota = bruto === "" ? null : Number(bruto);
    await registrarPosVenda(atorDoUsuario(usuario), id, nota, String(form.get("comentario") ?? ""));
    atualizarTelas(id);
    return { ok: "Pós-venda registrada." };
  } catch (erro) {
    return falha(erro, "Não foi possível registrar a pós-venda.");
  }
}

export async function notaAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("processoId") ?? "");
  try {
    const usuario = await exigirUsuario();
    await adicionarNota(atorDoUsuario(usuario), id, lerNota(form).texto);
    atualizarTelas(id);
    return { ok: "Nota registrada no histórico." };
  } catch (erro) {
    return falha(erro, "Não foi possível registrar a nota.");
  }
}

const EXTENSOES_BLOQUEADAS = [".exe", ".bat", ".cmd", ".com", ".sh", ".msi", ".js", ".jar", ".ps1", ".dll"];

export async function anexoAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("processoId") ?? "");
  try {
    const usuario = await exigirUsuario();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      throw new AppError("Selecione um arquivo.", 400, "DADOS_INVALIDOS");
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      throw new AppError("O arquivo deve ter no máximo 5 MB.", 400, "DADOS_INVALIDOS");
    }
    const nome = arquivo.name.replace(/[\r\n"]/g, "_").slice(0, 140);
    const extensao = nome.includes(".") ? nome.slice(nome.lastIndexOf(".")).toLowerCase() : "";
    if (EXTENSOES_BLOQUEADAS.includes(extensao)) {
      throw new AppError("Esse tipo de arquivo não pode ser anexado.", 400, "DADOS_INVALIDOS");
    }
    const processo = await prisma.processo.findUnique({ where: { id }, select: { id: true } });
    if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
    const conteudo = Buffer.from(await arquivo.arrayBuffer());
    await prisma.$transaction([
      prisma.anexo.create({
        data: {
          processoId: id,
          nomeArquivo: nome,
          tipoMime: arquivo.type || "application/octet-stream",
          tamanho: conteudo.length,
          conteudo,
          usuarioId: usuario.id,
        },
      }),
      prisma.evento.create({
        data: {
          processoId: id,
          tipo: "ANEXO",
          mensagem: `Anexo adicionado: ${nome}.`,
          usuarioId: usuario.id,
          origem: usuario.nome,
        },
      }),
    ]);
    atualizarTelas(id);
    return { ok: "Anexo enviado." };
  } catch (erro) {
    return falha(erro, "Não foi possível enviar o anexo.");
  }
}

export async function removerAnexoAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("anexoId") ?? "");
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador remove anexos.", 403, "PROIBIDO");
    const anexo = await prisma.anexo.findUnique({ where: { id } });
    if (!anexo) throw new AppError("Anexo não encontrado.", 404, "NAO_ENCONTRADO");
    await prisma.$transaction([
      prisma.anexo.delete({ where: { id } }),
      prisma.evento.create({
        data: {
          processoId: anexo.processoId,
          tipo: "ANEXO",
          mensagem: `Anexo removido: ${anexo.nomeArquivo}.`,
          usuarioId: usuario.id,
          origem: usuario.nome,
        },
      }),
    ]);
    atualizarTelas(anexo.processoId);
    return { ok: "Anexo removido." };
  } catch (erro) {
    return falha(erro, "Não foi possível remover o anexo.");
  }
}

export async function criarClienteAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const usuario = await exigirUsuario();
    const cliente = await criarCliente(atorDoUsuario(usuario), lerCliente(form));
    revalidatePath("/clientes");
    redirect(`/clientes/${cliente.id}`);
  } catch (erro) {
    return falha(erro, "Não foi possível criar o cliente.");
  }
}

export async function salvarClienteAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("clienteId") ?? "");
  try {
    const usuario = await exigirUsuario();
    await atualizarCliente(atorDoUsuario(usuario), id, lerPatchCliente(form));
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    return { ok: "Cliente atualizado." };
  } catch (erro) {
    return falha(erro, "Não foi possível salvar o cliente.");
  }
}

export async function criarContatoAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const clienteId = String(form.get("clienteId") ?? "");
  try {
    const usuario = await exigirUsuario();
    await criarContato(atorDoUsuario(usuario), clienteId, lerContato(form));
    revalidatePath(`/clientes/${clienteId}`);
    return { ok: "Contato adicionado." };
  } catch (erro) {
    return falha(erro, "Não foi possível adicionar o contato.");
  }
}

export async function criarUsuarioAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador gerencia a equipe.", 403, "PROIBIDO");
    const dados = lerUsuario(form);
    await prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        papel: dados.papel,
        senhaHash: await hashSenha(dados.senha),
      },
    });
    revalidatePath("/equipe");
    return { ok: "Usuário criado." };
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { erro: "Já existe um usuário com este e-mail." };
    }
    return falha(erro, "Não foi possível criar o usuário.");
  }
}

export async function alternarUsuarioAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("usuarioId") ?? "");
  const ativo = form.get("ativo") === "sim";
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador gerencia a equipe.", 403, "PROIBIDO");
    if (usuario.id === id && !ativo) throw new AppError("Você não pode desativar a própria conta.", 400, "DADOS_INVALIDOS");
    const alvo = await prisma.usuario.findUnique({ where: { id } });
    if (!alvo) throw new AppError("Usuário não encontrado.", 404, "NAO_ENCONTRADO");
    if (alvo.papel === "ADMIN" && alvo.ativo && !ativo) {
      const outros = await prisma.usuario.count({ where: { papel: "ADMIN", ativo: true, NOT: { id } } });
      if (outros === 0) throw new AppError("Mantenha ao menos um administrador ativo.", 400, "DADOS_INVALIDOS");
    }
    await prisma.usuario.update({ where: { id }, data: { ativo } });
    revalidatePath("/equipe");
    return { ok: ativo ? "Usuário reativado." : "Usuário desativado." };
  } catch (erro) {
    return falha(erro, "Não foi possível atualizar o usuário.");
  }
}

export async function criarChaveAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador cria chaves de API.", 403, "PROIBIDO");
    const dados = lerChave(form);
    const gerada = gerarChaveApi();
    await prisma.chaveApi.create({
      data: { nome: dados.nome, prefixo: gerada.prefixo, hash: gerada.hash, criadaPorId: usuario.id },
    });
    revalidatePath("/integracoes");
    return { ok: "Chave criada. Copie agora — ela não será mostrada de novo.", chave: gerada.chave };
  } catch (erro) {
    return falha(erro, "Não foi possível criar a chave.");
  }
}

export async function revogarChaveAction(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = String(form.get("chaveId") ?? "");
  try {
    const usuario = await exigirUsuario();
    if (usuario.papel !== "ADMIN") throw new AppError("Só um administrador revoga chaves.", 403, "PROIBIDO");
    const chave = await prisma.chaveApi.findUnique({ where: { id } });
    if (!chave) throw new AppError("Chave não encontrada.", 404, "NAO_ENCONTRADO");
    if (!chave.revogadaEm) {
      await prisma.chaveApi.update({ where: { id }, data: { revogadaEm: new Date() } });
    }
    revalidatePath("/integracoes");
    return { ok: "Chave revogada." };
  } catch (erro) {
    return falha(erro, "Não foi possível revogar a chave.");
  }
}

