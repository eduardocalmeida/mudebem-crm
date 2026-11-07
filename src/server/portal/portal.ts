import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { anoSaoPaulo } from "@/lib/format";
import { COOKIE_PORTAL, assinarPortal, lerPortal, novoTokenPortal, type SessaoPortal } from "@/lib/portal-token";
import { adicionarItens, type EntradaItem } from "@/server/inventario";
import { calcularPrecoContrato } from "@/server/portal/preco";

export async function portalPorSlug(slug: string) {
  const empresa = await prisma.empresaCliente.findUnique({
    where: { slug: slug.toLowerCase() },
    include: {
      unidades: { orderBy: { nome: "asc" } },
      contratos: { where: { ativo: true }, include: { faixas: true }, orderBy: { criadoEm: "desc" } },
    },
  });
  if (!empresa || !empresa.ativa) throw new AppError("Portal não encontrado.", 404, "NAO_ENCONTRADO");
  return empresa;
}

export async function sessaoPortal(): Promise<SessaoPortal | null> {
  const jar = await cookies();
  return lerPortal(jar.get(COOKIE_PORTAL)?.value);
}

export async function pedirLinkPortal(slug: string, email: string) {
  const empresa = await portalPorSlug(slug);
  const usuario = await prisma.usuarioPortal.findUnique({
    where: { empresaId_email: { empresaId: empresa.id, email: email.trim().toLowerCase() } },
  });
  if (!usuario || !usuario.ativo) throw new AppError("Este e-mail não está autorizado neste portal.", 403, "PROIBIDO");
  const { token, hash } = novoTokenPortal();
  await prisma.tokenPortal.create({
    data: { empresaId: empresa.id, email: usuario.email, hash, expiraEm: new Date(Date.now() + 30 * 60 * 1000) },
  });
  const link = `/p/${empresa.slug}/acesso?token=${token}`;
  await prisma.emailFila.create({
    data: {
      para: usuario.email,
      assunto: `Acesso ao portal ${empresa.nome}`,
      corpo: `Use este link por 30 minutos: ${link}`,
      status: "SEM_SMTP",
    },
  });
  return { link: process.env.NODE_ENV === "production" ? null : link };
}

export async function entrarComToken(slug: string, token: string) {
  const empresa = await portalPorSlug(slug);
  const hash = (await import("node:crypto")).createHash("sha256").update(token).digest("hex");
  const registro = await prisma.tokenPortal.findUnique({ where: { hash } });
  if (!registro || registro.usadoEm || registro.expiraEm.getTime() < Date.now() || registro.empresaId !== empresa.id) {
    throw new AppError("Link inválido ou expirado.", 400, "DADOS_INVALIDOS");
  }
  const usuario = await prisma.usuarioPortal.findUnique({
    where: { empresaId_email: { empresaId: empresa.id, email: registro.email } },
  });
  if (!usuario) throw new AppError("Usuário não encontrado.", 404, "NAO_ENCONTRADO");
  await prisma.tokenPortal.update({ where: { id: registro.id }, data: { usadoEm: new Date() } });
  const jwt = await assinarPortal({
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    empresaId: empresa.id,
    papel: usuario.papel === "GESTOR" ? "GESTOR" : "COLABORADOR",
  });
  const jar = await cookies();
  jar.set(COOKIE_PORTAL, jwt, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return usuario.papel === "GESTOR" ? `/p/${empresa.slug}/gestor` : `/p/${empresa.slug}/solicitar`;
}

async function proximoProtocolo(tx: Prisma.TransactionClient) {
  const prefixo = `MB-${anoSaoPaulo()}-`;
  const ultimo = await tx.solicitacaoPortal.findFirst({
    where: { protocolo: { startsWith: prefixo } },
    orderBy: { protocolo: "desc" },
  });
  const sequencia = ultimo ? Number(ultimo.protocolo.slice(prefixo.length)) + 1 : 1;
  return `${prefixo}${String(sequencia).padStart(6, "0")}`;
}

export async function enviarSolicitacao(entrada: {
  slug: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  unidadeId: string;
  dataPrevista: string;
  origemEndereco: string;
  origemCep: string;
  origemCidade: string;
  origemUf: string;
  destinoEndereco: string;
  destinoCep: string;
  destinoCidade: string;
  destinoUf: string;
  distanciaKm: number;
  valorDeclarado: number;
  itens: EntradaItem[];
}) {
  const sessao = await sessaoPortal();
  if (!sessao) throw new AppError("Entre no portal para enviar a solicitação.", 401, "NAO_AUTORIZADO");
  const empresa = await portalPorSlug(entrada.slug);
  if (sessao.empresaId !== empresa.id) throw new AppError("Portal incorreto.", 403, "PROIBIDO");
  const contrato = empresa.contratos[0];
  if (!contrato) throw new AppError("Não há contrato ativo.", 400, "DADOS_INVALIDOS");
  let volume = new Prisma.Decimal(0);
  const itens: EntradaItem[] = [];
  for (const item of entrada.itens) {
    const catalogo = item.catalogoId ? await prisma.itemCatalogo.findUnique({ where: { id: item.catalogoId } }) : null;
    const unitario = catalogo ? catalogo.volumeM3 : item.volumeM3 ?? 0;
    const quantidade = item.quantidade && item.quantidade > 0 ? item.quantidade : 1;
    volume = volume.plus(new Prisma.Decimal(unitario).mul(quantidade));
    itens.push({ ...item, quantidade, volumeM3: Number(unitario), nome: catalogo?.nome || item.nome });
  }
  const preco = calcularPrecoContrato(contrato.faixas, contrato.seguroPercentual, entrada.distanciaKm, volume, entrada.valorDeclarado);
  const cpf = entrada.cpf.replace(/\D/g, "");
  const criado = await prisma.$transaction(async (tx) => {
    const protocolo = await proximoProtocolo(tx);
    const processo = await tx.processo.create({
      data: {
        codigo: protocolo,
        titulo: `Mudança de ${entrada.nome}`,
        etapa: "A_EXECUTAR",
        canal: "SITE",
        clienteId: empresa.clienteId || (await tx.cliente.create({ data: { nome: empresa.nome } })).id,
        colaborador: entrada.nome,
        origemEndereco: entrada.origemEndereco,
        origemCidade: entrada.origemCidade,
        origemUf: entrada.origemUf,
        destinoEndereco: entrada.destinoEndereco,
        destinoCidade: entrada.destinoCidade,
        destinoUf: entrada.destinoUf,
        dataPretendida: entrada.dataPrevista ? new Date(`${entrada.dataPrevista}T00:00:00.000Z`) : null,
        volume: `${volume.toFixed(2).replace(".", ",")} m³`,
        valorCotado: preco.semFaixa ? null : preco.total,
        valorAprovado: preco.semFaixa ? null : preco.total,
        etiqueta: `Contrato ${empresa.nome}`,
        aprovacaoPortal: preco.semFaixa ? "ANALISE" : "PENDENTE",
        contratoEmpresaId: contrato.id,
        inventario: preco.semFaixa ? preco.motivo : "Pedido do portal corporativo.",
      },
    });
    const solicitacao = await tx.solicitacaoPortal.create({
      data: {
        protocolo,
        empresaId: empresa.id,
        contratoId: contrato.id,
        unidadeId: entrada.unidadeId,
        usuarioId: sessao.id,
        nome: entrada.nome,
        cpf,
        email: entrada.email.trim().toLowerCase(),
        telefone: entrada.telefone,
        dataPrevista: entrada.dataPrevista ? new Date(`${entrada.dataPrevista}T00:00:00.000Z`) : null,
        origemEndereco: entrada.origemEndereco,
        origemCep: entrada.origemCep,
        origemCidade: entrada.origemCidade,
        origemUf: entrada.origemUf,
        destinoEndereco: entrada.destinoEndereco,
        destinoCep: entrada.destinoCep,
        destinoCidade: entrada.destinoCidade,
        destinoUf: entrada.destinoUf,
        distanciaKm: entrada.distanciaKm,
        volumeM3: volume,
        valorDeclarado: entrada.valorDeclarado,
        precoPorKm: preco.semFaixa ? null : preco.precoPorKm,
        frete: preco.semFaixa ? null : preco.frete,
        seguro: preco.semFaixa ? null : preco.seguro,
        total: preco.semFaixa ? null : preco.total,
        semFaixa: preco.semFaixa,
        status: "ENVIADA",
        processoId: processo.id,
        itens: itens as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.evento.create({
      data: {
        processoId: processo.id,
        tipo: "CRIACAO",
        etapaPara: "A_EXECUTAR",
        mensagem: `Pedido ${protocolo} do portal ${empresa.nome}. ${preco.semFaixa ? preco.motivo : `Total ${preco.total.toFixed(2)}.`}`,
        origem: `Portal · ${sessao.email}`,
      },
    });
    await tx.notificacao.create({
      data: {
        titulo: `Novo pedido ${protocolo}`,
        mensagem: `${empresa.nome}: ${entrada.nome}. ${preco.semFaixa ? "Sem faixa contratual." : `Total R$ ${preco.total.toFixed(2)}.`}`,
        processoId: processo.id,
      },
    });
    await tx.emailFila.createMany({
      data: [
        {
          para: entrada.email,
          assunto: `Protocolo ${protocolo}`,
          corpo: preco.semFaixa
            ? "Recebemos sua solicitação. Ela segue para análise administrativa porque não há faixa contratual."
            : `Recebemos sua solicitação. Total estimado R$ ${preco.total.toFixed(2)}.`,
        },
        {
          para: "operacao@mudebem.local",
          assunto: `Portal ${empresa.nome}: ${protocolo}`,
          corpo: `Novo pedido em A executar, etiqueta Contrato ${empresa.nome}.`,
        },
      ],
    });
    return { protocolo, processoId: processo.id, solicitacaoId: solicitacao.id, preco };
  });
  if (itens.length > 0) await adicionarItens(criado.processoId, itens);
  return criado;
}

export async function decidirSolicitacao(id: string, decisao: "APROVADA" | "RECUSADA", motivo?: string) {
  const sessao = await sessaoPortal();
  if (!sessao || sessao.papel !== "GESTOR") throw new AppError("Só o gestor decide o pedido.", 403, "PROIBIDO");
  const solicitacao = await prisma.solicitacaoPortal.findUnique({ where: { id }, include: { empresa: true } });
  if (!solicitacao || solicitacao.empresaId !== sessao.empresaId || !solicitacao.processoId) {
    throw new AppError("Pedido não encontrado.", 404, "NAO_ENCONTRADO");
  }
  if (decisao === "RECUSADA" && !motivo?.trim()) throw new AppError("Informe o motivo da recusa.", 400, "DADOS_INVALIDOS");
  await prisma.$transaction([
    prisma.solicitacaoPortal.update({
      where: { id },
      data: { status: decisao, motivoRecusa: motivo?.trim() || null, decididoEm: new Date(), decididoPor: sessao.email },
    }),
    prisma.processo.update({
      where: { id: solicitacao.processoId },
      data: { aprovacaoPortal: decisao },
    }),
    prisma.notificacao.create({
      data: {
        titulo: `${solicitacao.protocolo} ${decisao === "APROVADA" ? "aprovado" : "recusado"}`,
        mensagem: motivo?.trim() || "O gestor aprovou o pedido.",
        processoId: solicitacao.processoId,
      },
    }),
    prisma.emailFila.create({
      data: {
        para: solicitacao.email,
        assunto: `${solicitacao.protocolo}: ${decisao === "APROVADA" ? "aprovado" : "recusado"}`,
        corpo: motivo?.trim() || "Seu pedido foi aprovado.",
      },
    }),
  ]);
}
