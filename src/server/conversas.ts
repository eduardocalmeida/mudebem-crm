import { Prisma, type CanalConversa, type TipoMensagemWhatsapp } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TIPOS: Record<TipoMensagemWhatsapp, "TEXTO" | "AUDIO" | "IMAGEM" | "VIDEO" | "DOCUMENTO" | "OUTRO"> = {
  TEXTO: "TEXTO",
  AUDIO: "AUDIO",
  IMAGEM: "IMAGEM",
  VIDEO: "VIDEO",
  DOCUMENTO: "DOCUMENTO",
  FIGURINHA: "OUTRO",
  LOCALIZACAO: "OUTRO",
  MODELO: "OUTRO",
  INTERATIVA: "OUTRO",
  DESCONHECIDO: "OUTRO",
};

export function rotuloCanalConversa(canal: CanalConversa) {
  if (canal === "WHATSAPP") return "WhatsApp";
  if (canal === "INSTAGRAM") return "Instagram";
  if (canal === "EMAIL") return "E-mail";
  if (canal === "TELEFONE") return "Telefone";
  return "Outro";
}

export function rotuloStatusConversa(status: "ABERTA" | "EM_ESPERA" | "FECHADA") {
  if (status === "ABERTA") return "Aberta";
  if (status === "EM_ESPERA") return "Em espera";
  return "Fechada";
}

export async function proximoNumeroConversa() {
  const linhas = await prisma.$queryRaw<{ n: bigint }[]>`SELECT nextval('conversa_numero_seq') AS n`;
  return `A${String(linhas[0]?.n ?? 1n).padStart(5, "0")}`;
}

function conteudoDe(tipo: TipoMensagemWhatsapp, texto: string | null) {
  const limpo = texto?.trim();
  if (limpo) return limpo;
  if (tipo === "AUDIO") return "[áudio]";
  if (tipo === "IMAGEM") return "[imagem]";
  if (tipo === "VIDEO") return "[vídeo]";
  if (tipo === "DOCUMENTO") return "[documento]";
  return "[mensagem]";
}

export async function espelharWhatsapp(conversaWhatsappId: string) {
  await prisma.$transaction(async (tx) => {
    const origem = await tx.conversaWhatsapp.findUnique({ where: { id: conversaWhatsappId } });
    if (!origem) return;
    let conversaId = origem.conversaId;
    if (!conversaId) {
      const numero = await proximoNumeroConversa();
      try {
        const criada = await tx.conversa.create({
          data: {
            numero,
            canal: "WHATSAPP",
            status: "ABERTA",
            processoId: origem.processoId,
            contatoId: origem.contatoId,
            responsavelId: origem.responsavelId,
            criadoEm: origem.criadoEm,
            ultimaMensagem: origem.ultimaMensagem,
            ultimaMensagemEm: origem.ultimaMensagemEm,
            naoLida: origem.naoLida,
          },
        });
        conversaId = criada.id;
      } catch (erro) {
        if (!(erro instanceof Prisma.PrismaClientKnownRequestError) || erro.code !== "P2002") throw erro;
        const deNovo = await tx.conversaWhatsapp.findUnique({ where: { id: origem.id }, select: { conversaId: true } });
        conversaId = deNovo?.conversaId ?? null;
        if (!conversaId) throw erro;
      }
      await tx.conversaWhatsapp.update({ where: { id: origem.id }, data: { conversaId } });
    } else {
      await tx.conversa.update({
        where: { id: conversaId },
        data: {
          processoId: origem.processoId,
          contatoId: origem.contatoId,
          responsavelId: origem.responsavelId,
          ultimaMensagem: origem.ultimaMensagem,
          ultimaMensagemEm: origem.ultimaMensagemEm,
          naoLida: origem.naoLida,
        },
      });
    }
    const pendentes = await tx.mensagemWhatsapp.findMany({
      where: { conversaId: origem.id, mensagem: null },
      orderBy: { criadaEm: "asc" },
    });
    if (pendentes.length === 0 || !conversaId) return;
    await tx.mensagem.createMany({
      data: pendentes.map((mensagem) => ({
        conversaId,
        canal: "WHATSAPP" as const,
        direcao: mensagem.direcao,
        conteudo: conteudoDe(mensagem.tipo, mensagem.texto),
        remetente: mensagem.direcao === "ENTRADA" ? origem.nomeContato || origem.waId : "Mude Bem",
        tipo: TIPOS[mensagem.tipo],
        criadaEm: mensagem.criadaEm,
        idExterno: mensagem.wamid,
        mensagemWhatsappId: mensagem.id,
      })),
    });
  });
}

export async function listarConversasAbertas(filtro?: { canal?: CanalConversa | null; status?: "ABERTA" | "EM_ESPERA" | "FECHADA" | "TODAS" }) {
  const status = filtro?.status && filtro.status !== "TODAS" ? filtro.status : filtro?.status === "TODAS" ? undefined : "ABERTA";
  return prisma.conversa.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(filtro?.canal ? { canal: filtro.canal } : {}),
    },
    orderBy: [{ ultimaMensagemEm: "desc" }, { criadoEm: "desc" }],
    include: {
      processo: { select: { id: true, codigo: true, titulo: true } },
      contato: { select: { nome: true } },
      responsavel: { select: { nome: true } },
      whatsapp: { select: { id: true, waId: true, nomeContato: true } },
    },
  });
}

export async function obterConversa(id: string) {
  const conversa = await prisma.conversa.findUnique({
    where: { id },
    include: {
      mensagens: { orderBy: { criadaEm: "asc" } },
      processo: { select: { id: true, codigo: true, titulo: true } },
      contato: { select: { id: true, nome: true } },
      responsavel: { select: { nome: true } },
      whatsapp: { select: { id: true } },
    },
  });
  if (conversa?.naoLida) {
    await prisma.conversa.update({ where: { id }, data: { naoLida: false } });
  }
  return conversa;
}

export async function abrirConversaDoProcesso(processoId: string, responsavelId: string | null, canal?: CanalConversa) {
  const aberta = await prisma.conversa.findFirst({
    where: { processoId, status: { not: "FECHADA" }, ...(canal ? { canal } : {}) },
    orderBy: { atualizadoEm: "desc" },
  });
  if (aberta) return aberta;
  const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { contatoId: true, responsavelId: true } });
  return prisma.conversa.create({
    data: {
      numero: await proximoNumeroConversa(),
      canal: canal ?? "OUTRO",
      processoId,
      contatoId: processo?.contatoId,
      responsavelId: processo?.responsavelId ?? responsavelId,
      naoLida: false,
    },
  });
}

export async function registrarMensagem(entrada: {
  conversaId: string;
  conteudo: string;
  canal: CanalConversa;
  direcao: "ENTRADA" | "SAIDA";
  remetente?: string | null;
}) {
  const conteudo = entrada.conteudo.trim();
  if (!conteudo) return null;
  const agora = new Date();
  const mensagem = await prisma.mensagem.create({
    data: {
      conversaId: entrada.conversaId,
      canal: entrada.canal,
      direcao: entrada.direcao,
      conteudo,
      remetente: entrada.remetente || null,
      tipo: "TEXTO",
      criadaEm: agora,
    },
  });
  await prisma.conversa.update({
    where: { id: entrada.conversaId },
    data: {
      canal: entrada.canal,
      ultimaMensagem: conteudo.slice(0, 180),
      ultimaMensagemEm: agora,
      naoLida: entrada.direcao === "ENTRADA",
      status: "ABERTA",
      fechadaEm: null,
    },
  });
  return mensagem;
}

export async function definirStatusConversa(id: string, status: "ABERTA" | "EM_ESPERA" | "FECHADA") {
  return prisma.conversa.update({
    where: { id },
    data: {
      status,
      fechadaEm: status === "FECHADA" ? new Date() : null,
      naoLida: status === "FECHADA" ? false : undefined,
    },
  });
}
