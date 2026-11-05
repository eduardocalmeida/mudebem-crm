import { Prisma } from "@prisma/client";
import type { Ator } from "@/lib/ator";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  dentroDaJanela,
  digitosTelefone,
  formatarWaId,
  interpretarMensagem,
  rotuloTipo,
  statusDaMeta,
  type StatusMensagem,
  type TipoMensagem,
} from "@/lib/whatsapp";
import { adicionarNota, criarProcesso } from "@/server/processos";
import { segredosWhatsapp, sincronizarNumerosDoAmbiente, tokenDoNumero } from "@/server/whatsapp-config";

const atorWhatsapp: Ator = { tipo: "api", chaveId: "whatsapp", nome: "WhatsApp Cloud API" };

type Payload = {
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: { profile?: { name?: string }; wa_id?: string }[];
        messages?: Record<string, unknown>[];
        message_echoes?: Record<string, unknown>[];
        statuses?: {
          id?: string;
          status?: string;
          timestamp?: string;
          errors?: { title?: string; message?: string }[];
        }[];
        history?: {
          metadata?: { phase?: number; chunk_order?: number; progress?: number };
          errors?: { code?: number; title?: string; message?: string }[];
          threads?: {
            id?: string;
            messages?: (Record<string, unknown> & { history_context?: { from_me?: boolean; status?: string } })[];
          }[];
        }[];
        state_sync?: {
          type?: string;
          action?: string;
          contact?: { full_name?: string; first_name?: string; phone_number?: string };
        }[];
      };
    }[];
  }[];
};

function resumo(tipo: TipoMensagem, texto: string | null): string {
  if (texto) return texto.slice(0, 180);
  return rotuloTipo(tipo);
}

async function contatoPorTelefone(waId: string) {
  const linhas = await prisma.$queryRaw<{ id: string; clienteId: string }[]>`
    SELECT id, "clienteId" FROM "Contato"
    WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\\D', '', 'g') = ${waId}
    LIMIT 1
  `;
  return linhas[0] ?? null;
}

async function garantirConversa(numeroId: string, waId: string, nome: string | null) {
  const existente = await prisma.conversaWhatsapp.findUnique({
    where: { numeroId_waId: { numeroId, waId } },
  });
  if (existente) {
    if (nome && !existente.nomeContato) {
      const atualizada = await prisma.conversaWhatsapp.update({ where: { id: existente.id }, data: { nomeContato: nome } });
      return { conversa: atualizada, processoCriado: false };
    }
    return { conversa: existente, processoCriado: false };
  }

  const contato = await contatoPorTelefone(waId);
  let processoId: string | null = null;
  let contatoId: string | null = contato?.id ?? null;

  if (!contato) {
    const nomeLead = nome && nome.trim().length >= 2 ? nome.trim() : `Lead ${formatarWaId(waId)}`;
    const processo = await criarProcesso(atorWhatsapp, {
      titulo: `Lead WhatsApp — ${nomeLead}`.slice(0, 180),
      canal: "WHATSAPP",
      etapa: "LEADS_DE_ENTRADA",
      cliente: { nome: nomeLead, telefone: formatarWaId(waId) },
      contato: { nome: nomeLead, telefone: formatarWaId(waId) },
    });
    contatoId = processo.contato?.id ?? null;
    processoId = processo.id;
  } else {
    const aberto = await prisma.processo.findFirst({
      where: {
        clienteId: contato.clienteId,
        etapa: { notIn: ["RECEBIDO", "PERDIDO", "GANHO"] },
      },
      orderBy: { atualizadoEm: "desc" },
      select: { id: true },
    });
    processoId = aberto?.id ?? null;
  }

  try {
    const conversa = await prisma.conversaWhatsapp.create({
      data: {
        numeroId,
        waId,
        nomeContato: nome,
        contatoId,
        processoId,
        naoLida: true,
      },
    });
    return { conversa, processoCriado: Boolean(processoId && !contato) };
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      const criada = await prisma.conversaWhatsapp.findUnique({
        where: { numeroId_waId: { numeroId, waId } },
      });
      if (criada) return { conversa: criada, processoCriado: false };
    }
    throw erro;
  }
}

async function abrirLead(conversaId: string, waId: string, nome: string | null) {
  const contato = await contatoPorTelefone(waId);
  let processoId: string | null = null;
  let contatoId: string | null = contato?.id ?? null;
  if (!contato) {
    const nomeLead = nome && nome.trim().length >= 2 ? nome.trim() : `Lead ${formatarWaId(waId)}`;
    const processo = await criarProcesso(atorWhatsapp, {
      titulo: `Lead WhatsApp — ${nomeLead}`.slice(0, 180),
      canal: "WHATSAPP",
      etapa: "LEADS_DE_ENTRADA",
      cliente: { nome: nomeLead, telefone: formatarWaId(waId) },
      contato: { nome: nomeLead, telefone: formatarWaId(waId) },
    });
    contatoId = processo.contato?.id ?? null;
    processoId = processo.id;
  } else {
    const aberto = await prisma.processo.findFirst({
      where: { clienteId: contato.clienteId, etapa: { notIn: ["RECEBIDO", "PERDIDO", "GANHO"] } },
      orderBy: { atualizadoEm: "desc" },
      select: { id: true },
    });
    processoId = aberto?.id ?? null;
  }
  const conversa = await prisma.conversaWhatsapp.update({
    where: { id: conversaId },
    data: { contatoId, processoId, nomeContato: nome ?? undefined },
  });
  return { conversa, processoCriado: Boolean(processoId && !contato) };
}

function statusDoHistorico(valor: string | undefined): StatusMensagem {
  const normal = valor?.toUpperCase();
  if (normal === "READ" || normal === "PLAYED") return "LIDA";
  if (normal === "DELIVERED") return "ENTREGUE";
  if (normal === "FAILED" || normal === "ERROR") return "FALHOU";
  return "ENVIADA";
}

async function gravarMensagem(
  conversaId: string,
  mensagem: ReturnType<typeof interpretarMensagem>,
  direcao: "ENTRADA" | "SAIDA",
  status: StatusMensagem,
) {
  if (mensagem.wamid) {
    const jaExiste = await prisma.mensagemWhatsapp.findUnique({ where: { wamid: mensagem.wamid } });
    if (jaExiste) return false;
  }
  await prisma.mensagemWhatsapp.create({
    data: {
      conversaId,
      wamid: mensagem.wamid,
      direcao,
      tipo: mensagem.tipo,
      texto: mensagem.texto,
      midiaId: mensagem.midiaId,
      midiaMime: mensagem.midiaMime,
      midiaNome: mensagem.midiaNome,
      status,
      criadaEm: mensagem.quando,
    },
  });
  return true;
}

async function conversaSemLead(numeroId: string, waId: string, nome: string | null) {
  const existente = await prisma.conversaWhatsapp.findUnique({ where: { numeroId_waId: { numeroId, waId } } });
  if (existente) {
    if (nome && !existente.nomeContato) {
      return prisma.conversaWhatsapp.update({ where: { id: existente.id }, data: { nomeContato: nome } });
    }
    return existente;
  }
  const contato = await contatoPorTelefone(waId);
  try {
    return await prisma.conversaWhatsapp.create({
      data: {
        numeroId,
        waId,
        nomeContato: nome,
        contatoId: contato?.id ?? null,
        naoLida: false,
      },
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      const criada = await prisma.conversaWhatsapp.findUnique({ where: { numeroId_waId: { numeroId, waId } } });
      if (criada) return criada;
    }
    throw erro;
  }
}

type BlocoHistorico = NonNullable<NonNullable<NonNullable<Payload["entry"]>[number]["changes"]>[number]["value"]>["history"];
type BlocoContatos = NonNullable<NonNullable<NonNullable<Payload["entry"]>[number]["changes"]>[number]["value"]>["state_sync"];

async function importarHistorico(numeroId: string, blocos: BlocoHistorico) {
  if (!blocos) return;
  for (const bloco of blocos) {
    const erro = bloco.errors?.[0];
    if (erro && !bloco.threads?.length) {
      await prisma.numeroWhatsapp.update({
        where: { id: numeroId },
        data: {
          historicoStatus: "recusado",
          historicoErro: erro.title || erro.message || "A empresa não compartilhou o histórico.",
        },
      });
      continue;
    }
    const progresso = bloco.metadata?.progress;
    if (typeof progresso === "number") {
      await prisma.numeroWhatsapp.update({
        where: { id: numeroId },
        data: {
          historicoProgresso: progresso,
          historicoStatus: progresso >= 100 ? "concluido" : "sincronizando",
        },
      });
    }
    for (const fio of bloco.threads ?? []) {
      const cliente = digitosTelefone(fio.id);
      if (!cliente) continue;
      let ultimaMensagem: { quando: Date; texto: string } | null = null;
      let ultimaEntrada: Date | null = null;
      const conversa = await conversaSemLead(numeroId, cliente, null);
      for (const bruta of fio.messages ?? []) {
        if (bruta.type === "media_placeholder") {
          bruta.text = { body: "Mídia antiga. O arquivo só volta se a mensagem tiver menos de 14 dias." };
          bruta.type = "text";
        }
        const mensagem = interpretarMensagem(bruta);
        const daEmpresa = bruta.history_context?.from_me === true;
        const gravou = await gravarMensagem(
          conversa.id,
          mensagem,
          daEmpresa ? "SAIDA" : "ENTRADA",
          daEmpresa ? statusDoHistorico(bruta.history_context?.status) : "RECEBIDA",
        );
        if (!gravou) continue;
        if (!ultimaMensagem || mensagem.quando > ultimaMensagem.quando) {
          ultimaMensagem = { quando: mensagem.quando, texto: resumo(mensagem.tipo, mensagem.texto) };
        }
        if (!daEmpresa && (!ultimaEntrada || mensagem.quando > ultimaEntrada)) ultimaEntrada = mensagem.quando;
      }
      if (!ultimaMensagem) continue;
      const atual = await prisma.conversaWhatsapp.findUnique({ where: { id: conversa.id } });
      const maisNova = !atual?.ultimaMensagemEm || ultimaMensagem.quando > atual.ultimaMensagemEm;
      await prisma.conversaWhatsapp.update({
        where: { id: conversa.id },
        data: {
          ...(maisNova ? { ultimaMensagem: ultimaMensagem.texto, ultimaMensagemEm: ultimaMensagem.quando } : {}),
          ...(ultimaEntrada && (!atual?.ultimaEntradaEm || ultimaEntrada > atual.ultimaEntradaEm)
            ? { ultimaEntradaEm: ultimaEntrada }
            : {}),
        },
      });
    }
  }
}

async function importarContatosDoApp(numeroId: string, contatos: BlocoContatos) {
  for (const item of contatos ?? []) {
    if (item.action === "remove") continue;
    const waId = digitosTelefone(item.contact?.phone_number);
    const nome = item.contact?.full_name?.trim() || item.contact?.first_name?.trim() || null;
    if (!waId) continue;
    await conversaSemLead(numeroId, waId, nome);
  }
}

async function importarEcos(numeroId: string, ecos: Record<string, unknown>[]) {
  for (const bruta of ecos) {
    const mensagem = interpretarMensagem(bruta);
    const destino = digitosTelefone(typeof bruta.to === "string" ? bruta.to : "");
    if (!destino) continue;
    const conversa = await conversaSemLead(numeroId, destino, null);
    const gravou = await gravarMensagem(conversa.id, mensagem, "SAIDA", "ENVIADA");
    if (!gravou) continue;
    await prisma.conversaWhatsapp.update({
      where: { id: conversa.id },
      data: { ultimaMensagem: resumo(mensagem.tipo, mensagem.texto), ultimaMensagemEm: mensagem.quando },
    });
  }
}

export async function processarWebhook(payload: Payload) {
  await sincronizarNumerosDoAmbiente();
  for (const entrada of payload.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      const valor = mudanca.value;
      if (!valor) continue;
      const phoneNumberId = valor.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      const numero = await prisma.numeroWhatsapp.findUnique({ where: { phoneNumberId } });
      if (!numero || !numero.ativo) continue;

      if (valor.history) await importarHistorico(numero.id, valor.history);
      if (valor.state_sync) await importarContatosDoApp(numero.id, valor.state_sync);
      if (valor.message_echoes) await importarEcos(numero.id, valor.message_echoes);

      for (const status of valor.statuses ?? []) {
        if (!status.id) continue;
        const mapeado = statusDaMeta(status.status);
        if (!mapeado) continue;
        const erro = status.errors?.[0]?.title || status.errors?.[0]?.message || null;
        await prisma.mensagemWhatsapp.updateMany({
          where: { wamid: status.id },
          data: { status: mapeado, ...(erro ? { erro } : {}) },
        });
      }

      const nomes = new Map<string, string>();
      for (const contato of valor.contacts ?? []) {
        const id = digitosTelefone(contato.wa_id);
        const nome = contato.profile?.name?.trim();
        if (id && nome) nomes.set(id, nome);
      }

      for (const bruta of valor.messages ?? []) {
        const mensagem = interpretarMensagem(bruta);
        if (!mensagem.de) continue;
        let { conversa, processoCriado } = await garantirConversa(numero.id, mensagem.de, nomes.get(mensagem.de) ?? null);
        if (!processoCriado && !conversa.processoId && !conversa.contatoId) {
          const aberto = await abrirLead(conversa.id, conversa.waId, nomes.get(mensagem.de) ?? conversa.nomeContato);
          conversa = aberto.conversa;
          processoCriado = aberto.processoCriado;
        }
        if (mensagem.wamid) {
          const jaExiste = await prisma.mensagemWhatsapp.findUnique({ where: { wamid: mensagem.wamid } });
          if (jaExiste) continue;
        }
        await prisma.mensagemWhatsapp.create({
          data: {
            conversaId: conversa.id,
            wamid: mensagem.wamid,
            direcao: "ENTRADA",
            tipo: mensagem.tipo,
            texto: mensagem.texto,
            midiaId: mensagem.midiaId,
            midiaMime: mensagem.midiaMime,
            midiaNome: mensagem.midiaNome,
            status: "RECEBIDA",
            criadaEm: mensagem.quando,
          },
        });
        await prisma.conversaWhatsapp.update({
          where: { id: conversa.id },
          data: {
            naoLida: true,
            nomeContato: conversa.nomeContato ?? nomes.get(mensagem.de) ?? undefined,
            ultimaMensagem: resumo(mensagem.tipo, mensagem.texto),
            ultimaMensagemEm: mensagem.quando,
            ultimaEntradaEm: mensagem.quando,
          },
        });
        if (processoCriado && conversa.processoId && mensagem.texto) {
          await adicionarNota(atorWhatsapp, conversa.processoId, `WhatsApp: ${mensagem.texto}`.slice(0, 5000));
        }
      }
    }
  }
}

export type EnvioWhatsapp =
  | { texto: string }
  | { modelo: { nome: string; idioma: string; parametros?: string[] } };

type FetchComo = typeof fetch;

export async function enviarMensagem(
  conversaId: string,
  envio: EnvioWhatsapp,
  opcoes?: { fetchImpl?: FetchComo; agora?: Date },
) {
  await sincronizarNumerosDoAmbiente();
  const conversa = await prisma.conversaWhatsapp.findUnique({
    where: { id: conversaId },
    include: { numero: true },
  });
  if (!conversa) throw new AppError("Conversa não encontrada.", 404, "NAO_ENCONTRADO");
  if (!conversa.numero.ativo) throw new AppError("Este número de WhatsApp está desativado.", 400, "DADOS_INVALIDOS");

  const modelo = "modelo" in envio ? envio.modelo : null;
  const texto = "texto" in envio ? envio.texto.trim() : "";
  if (!modelo && !dentroDaJanela(conversa.ultimaEntradaEm, opcoes?.agora)) {
    throw new AppError(
      "A janela de 24 horas está fechada. Fora dela a Meta só aceita um modelo aprovado.",
      409,
      "JANELA_ENCERRADA",
    );
  }

  const segredos = await segredosWhatsapp();
  const token = tokenDoNumero(conversa.numero, segredos);
  if (!token) throw new AppError("Nenhum token de acesso configurado para este número.", 400, "DADOS_INVALIDOS");

  const corpo = modelo
    ? {
        messaging_product: "whatsapp",
        to: conversa.waId,
        type: "template",
        template: {
          name: modelo.nome,
          language: { code: modelo.idioma || "pt_BR" },
          ...(modelo.parametros && modelo.parametros.length > 0
            ? {
                components: [
                  {
                    type: "body",
                    parameters: modelo.parametros.map((parametro) => ({ type: "text", text: parametro })),
                  },
                ],
              }
            : {}),
        },
      }
    : {
        messaging_product: "whatsapp",
        to: conversa.waId,
        type: "text",
        text: { body: texto },
      };

  const buscar = opcoes?.fetchImpl ?? fetch;
  const resposta = await buscar(`https://graph.facebook.com/${segredos.apiVersion}/${conversa.numero.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const json = (await resposta.json().catch(() => null)) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  } | null;

  if (!resposta.ok) {
    const detalhe = json?.error?.message || "A Meta recusou o envio.";
    await prisma.mensagemWhatsapp.create({
      data: {
        conversaId: conversa.id,
        direcao: "SAIDA",
        tipo: modelo ? "MODELO" : "TEXTO",
        texto: modelo ? `Modelo ${modelo.nome}` : texto,
        status: "FALHOU",
        erro: detalhe,
        criadaEm: new Date(),
      },
    });
    throw new AppError(detalhe, 502, "FALHA_ENVIO");
  }

  const wamid = json?.messages?.[0]?.id ?? null;
  const previa = modelo ? `Modelo ${modelo.nome}` : texto;
  const mensagem = await prisma.mensagemWhatsapp.create({
    data: {
      conversaId: conversa.id,
      wamid,
      direcao: "SAIDA",
      tipo: modelo ? "MODELO" : "TEXTO",
      texto: previa,
      status: "ENVIADA",
      criadaEm: new Date(),
    },
  });
  await prisma.conversaWhatsapp.update({
    where: { id: conversa.id },
    data: { ultimaMensagem: previa.slice(0, 180), ultimaMensagemEm: mensagem.criadaEm },
  });
  return mensagem;
}

export async function listarModelos(numeroId: string) {
  const segredos = await segredosWhatsapp();
  if (!segredos.wabaId) return [];
  const numero = await prisma.numeroWhatsapp.findUnique({ where: { id: numeroId } });
  if (!numero) return [];
  const token = tokenDoNumero(numero, segredos);
  if (!token) return [];
  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${segredos.apiVersion}/${segredos.wabaId}/message_templates?limit=50&status=APPROVED`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resposta.ok) return [];
    const json = (await resposta.json()) as { data?: { name: string; language: string; status: string }[] };
    return (json.data ?? []).map((modelo) => ({ nome: modelo.name, idioma: modelo.language }));
  } catch {
    return [];
  }
}

const includeConversa = {
  numero: { select: { id: true, nome: true, numeroExibicao: true, phoneNumberId: true } },
  responsavel: { select: { id: true, nome: true } },
  contato: { select: { id: true, nome: true, telefone: true } },
  processo: { select: { id: true, codigo: true, titulo: true, etapa: true } },
} satisfies Prisma.ConversaWhatsappInclude;

function dtoConversa(
  conversa: Prisma.ConversaWhatsappGetPayload<{ include: typeof includeConversa }>,
  agora = new Date(),
) {
  return {
    id: conversa.id,
    waId: conversa.waId,
    telefone: formatarWaId(conversa.waId),
    nome: conversa.nomeContato || conversa.contato?.nome || formatarWaId(conversa.waId),
    naoLida: conversa.naoLida,
    ultimaMensagem: conversa.ultimaMensagem,
    ultimaMensagemEm: conversa.ultimaMensagemEm?.toISOString() ?? null,
    ultimaEntradaEm: conversa.ultimaEntradaEm?.toISOString() ?? null,
    dentroDaJanela: dentroDaJanela(conversa.ultimaEntradaEm, agora),
    exemplo: conversa.exemplo,
    numero: conversa.numero,
    responsavel: conversa.responsavel,
    contato: conversa.contato,
    processo: conversa.processo,
  };
}

export async function listarConversas(filtro: { naoLidas?: boolean; numeroId?: string }) {
  await sincronizarNumerosDoAmbiente();
  const conversas = await prisma.conversaWhatsapp.findMany({
    where: {
      ...(filtro.naoLidas ? { naoLida: true } : {}),
      ...(filtro.numeroId ? { numeroId: filtro.numeroId } : {}),
    },
    include: includeConversa,
    orderBy: { ultimaMensagemEm: "desc" },
    take: 100,
  });
  return conversas.map((conversa) => dtoConversa(conversa));
}

export async function obterConversa(id: string, marcarLida: boolean) {
  const conversa = await prisma.conversaWhatsapp.findUnique({
    where: { id },
    include: {
      ...includeConversa,
      mensagens: { orderBy: { criadaEm: "asc" } },
    },
  });
  if (!conversa) throw new AppError("Conversa não encontrada.", 404, "NAO_ENCONTRADO");
  if (marcarLida && conversa.naoLida) {
    await prisma.conversaWhatsapp.update({ where: { id }, data: { naoLida: false } });
  }
  return {
    ...dtoConversa({ ...conversa, naoLida: marcarLida ? false : conversa.naoLida }),
    mensagens: conversa.mensagens.map((mensagem) => ({
      id: mensagem.id,
      wamid: mensagem.wamid,
      direcao: mensagem.direcao,
      tipo: mensagem.tipo,
      tipoRotulo: rotuloTipo(mensagem.tipo),
      texto: mensagem.texto,
      midiaId: mensagem.midiaId,
      midiaMime: mensagem.midiaMime,
      midiaNome: mensagem.midiaNome,
      status: mensagem.status as StatusMensagem,
      erro: mensagem.erro,
      criadaEm: mensagem.criadaEm.toISOString(),
    })),
  };
}

export async function atribuirConversa(id: string, responsavelId: string | null) {
  if (responsavelId) {
    const usuario = await prisma.usuario.findUnique({ where: { id: responsavelId } });
    if (!usuario || !usuario.ativo) throw new AppError("Responsável não encontrado.", 400, "DADOS_INVALIDOS");
  }
  const conversa = await prisma.conversaWhatsapp.update({
    where: { id },
    data: { responsavelId },
  });
  return conversa;
}

export async function vincularProcesso(id: string, referencia: string | null) {
  if (!referencia) {
    return prisma.conversaWhatsapp.update({ where: { id }, data: { processoId: null } });
  }
  const processo = await prisma.processo.findFirst({
    where: { OR: [{ id: referencia }, { codigo: referencia }] },
    select: { id: true },
  });
  if (!processo) throw new AppError("Processo não encontrado.", 404, "NAO_ENCONTRADO");
  return prisma.conversaWhatsapp.update({ where: { id }, data: { processoId: processo.id } });
}

export async function baixarMidia(mensagemId: string) {
  const mensagem = await prisma.mensagemWhatsapp.findUnique({
    where: { id: mensagemId },
    include: { conversa: { include: { numero: true } } },
  });
  if (!mensagem?.midiaId) throw new AppError("Esta mensagem não tem mídia.", 404, "NAO_ENCONTRADO");
  const segredos = await segredosWhatsapp();
  const token = tokenDoNumero(mensagem.conversa.numero, segredos);
  if (!token) throw new AppError("Nenhum token de acesso configurado.", 400, "DADOS_INVALIDOS");
  const meta = await fetch(`https://graph.facebook.com/${segredos.apiVersion}/${mensagem.midiaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meta.ok) throw new AppError("A Meta não devolveu a mídia.", 502, "FALHA_ENVIO");
  const info = (await meta.json()) as { url?: string; mime_type?: string };
  if (!info.url) throw new AppError("A Meta não devolveu a URL da mídia.", 502, "FALHA_ENVIO");
  const arquivo = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!arquivo.ok) throw new AppError("Não foi possível baixar a mídia.", 502, "FALHA_ENVIO");
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  return {
    bytes,
    mime: info.mime_type || mensagem.midiaMime || "application/octet-stream",
    nome: mensagem.midiaNome || "midia",
  };
}
