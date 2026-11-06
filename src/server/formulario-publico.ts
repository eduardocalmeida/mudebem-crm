import { z } from "zod";
import { COMODOS } from "@/server/catalogo-mudanca";
import { criarTarefasDaEtapa } from "@/server/tarefas";
import { AppError, erroZod } from "@/lib/errors";
import { anoSaoPaulo, interpretarData, UFS } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const JANELA_MS = 60 * 60 * 1000;
export const LIMITE_ENVIOS_FORMULARIO = 5;
const tentativas = new Map<string, number[]>();

export function limparLimiteFormulario() {
  tentativas.clear();
}

export function registrarEnvioFormulario(ip: string, agora = Date.now()) {
  const recentes = (tentativas.get(ip) ?? []).filter((marca) => agora - marca < JANELA_MS);
  if (recentes.length >= LIMITE_ENVIOS_FORMULARIO) {
    tentativas.set(ip, recentes);
    return false;
  }
  recentes.push(agora);
  tentativas.set(ip, recentes);
  return true;
}

export function ipDaRequisicao(req: Request) {
  const encaminhado = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const direto = req.headers.get("x-real-ip")?.trim();
  return (encaminhado || direto || "local").slice(0, 80);
}

const comodos = COMODOS.map((comodo) => comodo.id) as [string, ...string[]];
const ufs = UFS as unknown as [string, ...string[]];

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((valor) => {
      const limpo = valor?.trim() ?? "";
      return limpo ? limpo : null;
    });

const dataCampo = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((valor, ctx) => {
    if (!valor?.trim()) return null;
    const iso = interpretarData(valor);
    if (!iso) {
      ctx.addIssue({ code: "custom", message: "Use uma data válida." });
      return z.NEVER;
    }
    return iso;
  });

const esquema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(120),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((valor, ctx) => {
      const email = valor?.trim().toLowerCase() ?? "";
      if (!email) return null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ctx.addIssue({ code: "custom", message: "E-mail inválido." });
        return z.NEVER;
      }
      return email;
    }),
  telefone: texto(40),
  observacoes: texto(2000),
  origemEndereco: texto(300),
  origemCep: texto(12),
  origemLogradouro: texto(120),
  origemNumero: texto(20),
  origemComplemento: texto(80),
  origemBairro: texto(80),
  origemCidade: texto(80),
  origemUf: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .transform((valor, ctx) => {
      if (!valor) return null;
      if (!ufs.includes(valor)) {
        ctx.addIssue({ code: "custom", message: "UF de origem inválida." });
        return z.NEVER;
      }
      return valor;
    }),
  origemReferencia: texto(180),
  origemAndar: texto(20),
  origemElevador: texto(20),
  origemImovel: texto(40),
  destinoEndereco: texto(300),
  destinoCep: texto(12),
  destinoLogradouro: texto(120),
  destinoNumero: texto(20),
  destinoComplemento: texto(80),
  destinoBairro: texto(80),
  destinoCidade: texto(80),
  destinoUf: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .transform((valor, ctx) => {
      if (!valor) return null;
      if (!ufs.includes(valor)) {
        ctx.addIssue({ code: "custom", message: "UF de destino inválida." });
        return z.NEVER;
      }
      return valor;
    }),
  destinoReferencia: texto(180),
  destinoAndar: texto(20),
  destinoElevador: texto(20),
  destinoImovel: texto(40),
  dataPretendida: dataCampo,
  dataColeta: dataCampo,
  comoConheceu: texto(80),
  transferenciaEmpresa: z.boolean().optional().nullable(),
  empresaTrabalho: texto(120),
  utmSource: texto(120),
  utmMedium: texto(120),
  utmCampaign: texto(180),
  utmTerm: texto(180),
  utmContent: texto(180),
  fbclid: texto(200),
  gclid: texto(200),
  referrer: texto(500),
  website: z.string().optional().nullable(),
  itens: z
    .array(
      z.object({
        catalogoId: z.string().trim().min(1),
        comodo: z.enum(comodos),
        quantidade: z.coerce.number().int().min(1).max(99).default(1),
        fragil: z.boolean().optional(),
        desmontagem: z.boolean().optional(),
        embalagem: z.boolean().optional(),
      }),
    )
    .max(60)
    .optional()
    .default([]),
});

export type LeadPublico = z.infer<typeof esquema>;

function objetoJson(valor: unknown): Record<string, unknown> {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) return { ...(valor as Record<string, unknown>) };
  return {};
}

export function montarEndereco(partes: {
  endereco?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
}) {
  const rua = [partes.logradouro, partes.numero].filter(Boolean).join(", ");
  const cep = partes.cep ? `CEP ${partes.cep}` : "";
  const montado = [rua, partes.complemento, partes.bairro, cep].filter(Boolean).join(" · ");
  const textoEndereco = montado || partes.endereco || "";
  return textoEndereco.trim() ? textoEndereco.trim().slice(0, 300) : null;
}

function textoComercial(dados: LeadPublico) {
  const linhas: string[] = [];
  if (dados.observacoes) linhas.push(dados.observacoes);
  if (dados.comoConheceu) linhas.push(`Como conheceu: ${dados.comoConheceu}.`);
  if (dados.transferenciaEmpresa === true) {
    linhas.push(
      dados.empresaTrabalho
        ? `Mudança por transferência de empresa: sim. Empresa: ${dados.empresaTrabalho}.`
        : "Mudança por transferência de empresa: sim. Nome da empresa não informado.",
    );
  } else if (dados.transferenciaEmpresa === false) {
    linhas.push("Mudança por transferência de empresa: não.");
  }
  const textoFinal = linhas.join("\n");
  return textoFinal ? textoFinal.slice(0, 4000) : null;
}

function extrasDoFormulario(dados: LeadPublico) {
  return {
    formularioPublico: {
      origem: {
        cep: dados.origemCep,
        logradouro: dados.origemLogradouro,
        numero: dados.origemNumero,
        complemento: dados.origemComplemento,
        bairro: dados.origemBairro,
      },
      destino: {
        cep: dados.destinoCep,
        logradouro: dados.destinoLogradouro,
        numero: dados.destinoNumero,
        complemento: dados.destinoComplemento,
        bairro: dados.destinoBairro,
      },
      comoConheceu: dados.comoConheceu,
      transferenciaEmpresa: dados.transferenciaEmpresa ?? null,
      empresaTrabalho: dados.empresaTrabalho,
    },
  };
}

function digitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
}

function dia(iso: string | null) {
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

async function proximoCodigo(tx: Pick<typeof prisma, "$executeRaw" | "processo">) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(42811986)`;
  const prefixo = `MB-${anoSaoPaulo()}-`;
  const ultimo = await tx.processo.findFirst({
    where: { codigo: { startsWith: prefixo } },
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const sequencia = ultimo ? Number(ultimo.codigo.slice(prefixo.length)) + 1 : 1;
  return `${prefixo}${String(sequencia).padStart(4, "0")}`;
}

export async function receberLeadPublico(entrada: unknown) {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) throw erroZod(resultado.error);
  const dados = resultado.data;
  if (dados.website?.trim()) return { recebido: true as const, ignorado: true as const };
  const fone = digitos(dados.telefone);
  if (!dados.email && fone.length < 8) {
    throw new AppError("Informe e-mail ou telefone.", 400, "DADOS_INVALIDOS");
  }

  const salvo = await prisma.$transaction(async (tx) => {
    const contato = await acharContato(tx, dados.email, fone);
    const clienteId = contato ? await atualizarPessoa(tx, contato, dados) : await criarPessoa(tx, dados);
    const contatoId = contato?.id ?? (await tx.contato.findFirst({ where: { clienteId, principal: true }, select: { id: true } }))?.id;
    if (!contatoId) throw new AppError("Não foi possível gravar o contato.", 500, "ERRO_INTERNO");

    const aberto = await tx.processo.findFirst({
      where: { contatoId, etapa: "LEADS_DE_ENTRADA" },
      orderBy: { criadoEm: "desc" },
    });
    const campos = {
      ...camposDoLead(dados),
      extras: { ...objetoJson(aberto?.extras), ...extrasDoFormulario(dados) },
    };
    const processo = aberto
      ? await tx.processo.update({ where: { id: aberto.id }, data: campos })
      : await tx.processo.create({
          data: {
            ...campos,
            codigo: await proximoCodigo(tx),
            etapa: "LEADS_DE_ENTRADA",
            canal: "SITE",
            clienteId,
            contatoId,
            formulario: "orcamento-site",
          },
        });

    await tx.itemInventario.deleteMany({ where: { processoId: processo.id } });
    let quantidade = 0;
    let volume = 0;
    for (const item of dados.itens) {
      const catalogo = await tx.itemCatalogo.findUnique({ where: { id: item.catalogoId } });
      if (!catalogo || !catalogo.ativo) {
        throw new AppError("Item do catálogo não encontrado.", 400, "DADOS_INVALIDOS");
      }
      const unitario = catalogo.volumeM3.toNumber();
      quantidade += item.quantidade;
      volume += item.quantidade * unitario;
      await tx.itemInventario.create({
        data: {
          processoId: processo.id,
          catalogoId: catalogo.id,
          nome: catalogo.nome,
          comodo: item.comodo,
          quantidade: item.quantidade,
          volumeUnitario: catalogo.volumeM3,
          fragil: Boolean(item.fragil),
          desmontagem: Boolean(item.desmontagem),
          embalagem: Boolean(item.embalagem),
        },
      });
    }
    const volumeTexto = `${volume.toFixed(2).replace(".", ",")} m³`;
    await tx.processo.update({
      where: { id: processo.id },
      data: {
        volume: volumeTexto,
        inventario: `Enviado pelo site: ${quantidade} itens, ${volumeTexto}.`,
      },
    });
    await tx.evento.create({
      data: {
        processoId: processo.id,
        tipo: aberto ? "ATUALIZACAO" : "CRIACAO",
        etapaPara: aberto ? null : "LEADS_DE_ENTRADA",
        mensagem: aberto
          ? "Lead atualizado pelo formulário do site."
          : "Lead recebido pelo formulário do site, em Leads de entrada.",
        origem: "Formulário do site",
      },
    });
    return { id: processo.id, codigo: processo.codigo, atualizado: Boolean(aberto), quantidade, volume: volumeTexto, novo: !aberto };
  });

  if (salvo.novo) {
    try {
      await criarTarefasDaEtapa(salvo.id, "LEADS_DE_ENTRADA", null);
    } catch (erro) {
      console.error(erro);
    }
  }
  return {
    recebido: true as const,
    codigo: salvo.codigo,
    atualizado: salvo.atualizado,
    quantidade: salvo.quantidade,
    volume: salvo.volume,
  };
}

function camposDoLead(dados: LeadPublico) {
  const origem = dados.origemCidade;
  const destino = dados.destinoCidade;
  const titulo = origem && destino ? `Mudança ${origem} → ${destino}` : `Mudança de ${dados.nome}`;
  return {
    titulo,
    colaborador: dados.nome,
    origemEndereco: montarEndereco({
      endereco: dados.origemEndereco,
      logradouro: dados.origemLogradouro,
      numero: dados.origemNumero,
      complemento: dados.origemComplemento,
      bairro: dados.origemBairro,
      cep: dados.origemCep,
    }),
    origemCidade: dados.origemCidade,
    origemUf: dados.origemUf,
    origemReferencia: dados.origemReferencia,
    origemAndar: dados.origemAndar,
    origemElevador: dados.origemElevador,
    origemImovel: dados.origemImovel,
    destinoEndereco: montarEndereco({
      endereco: dados.destinoEndereco,
      logradouro: dados.destinoLogradouro,
      numero: dados.destinoNumero,
      complemento: dados.destinoComplemento,
      bairro: dados.destinoBairro,
      cep: dados.destinoCep,
    }),
    destinoCidade: dados.destinoCidade,
    destinoUf: dados.destinoUf,
    destinoReferencia: dados.destinoReferencia,
    destinoAndar: dados.destinoAndar,
    destinoElevador: dados.destinoElevador,
    destinoImovel: dados.destinoImovel,
    dataPretendida: dia(dados.dataPretendida),
    dataColeta: dia(dados.dataColeta),
    itensEspeciais: textoComercial(dados),
    fonte: dados.comoConheceu ?? dados.utmSource ?? "site",
    utmSource: dados.utmSource,
    utmMedium: dados.utmMedium,
    utmCampaign: dados.utmCampaign,
    utmTerm: dados.utmTerm,
    utmContent: dados.utmContent,
    fbclid: dados.fbclid,
    gclid: dados.gclid,
    referrer: dados.referrer,
    formulario: "orcamento-site",
  };
}

type ContatoAchado = { id: string; clienteId: string; nome: string; email: string | null; telefone: string | null };

async function acharContato(tx: Pick<typeof prisma, "contato">, email: string | null, fone: string): Promise<ContatoAchado | null> {
  if (email) {
    const porEmail = await tx.contato.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { criadoEm: "desc" },
    });
    if (porEmail) return porEmail;
  }
  if (fone.length < 8) return null;
  const finais = fone.slice(-8);
  const candidatos = await tx.contato.findMany({
    where: { telefone: { contains: finais } },
    orderBy: { criadoEm: "desc" },
    take: 20,
  });
  return candidatos.find((contato) => digitos(contato.telefone).endsWith(finais)) ?? null;
}

async function atualizarPessoa(
  tx: Pick<typeof prisma, "contato" | "cliente">,
  contato: ContatoAchado,
  dados: LeadPublico,
) {
  await tx.contato.update({
    where: { id: contato.id },
    data: { nome: dados.nome, email: dados.email ?? contato.email, telefone: dados.telefone ?? contato.telefone },
  });
  const cliente = await tx.cliente.findUnique({
    where: { id: contato.clienteId },
    include: { _count: { select: { contatos: true } } },
  });
  if (!cliente) return contato.clienteId;
  const pessoa = cliente._count.contatos <= 1 && cliente.nome === contato.nome;
  await tx.cliente.update({
    where: { id: cliente.id },
    data: {
      nome: pessoa ? dados.nome : cliente.nome,
      email: pessoa || !cliente.email ? dados.email ?? cliente.email : cliente.email,
      telefone: pessoa || !cliente.telefone ? dados.telefone ?? cliente.telefone : cliente.telefone,
      cidade: cliente.cidade || dados.origemCidade,
      uf: cliente.uf || dados.origemUf,
    },
  });
  return cliente.id;
}

async function criarPessoa(tx: Pick<typeof prisma, "cliente" | "contato">, dados: LeadPublico) {
  const cliente = await tx.cliente.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      cidade: dados.origemCidade,
      uf: dados.origemUf,
      endereco: dados.origemEndereco,
    },
  });
  await tx.contato.create({
    data: {
      clienteId: cliente.id,
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      principal: true,
    },
  });
  return cliente.id;
}
