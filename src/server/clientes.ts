import { Prisma } from "@prisma/client";
import { autoridadeDo, type Ator } from "@/lib/ator";
import { podeGerirClientes } from "@/lib/domain";
import { AppError } from "@/lib/errors";
import { formatarCnpj } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { DadosCliente, DadosContato } from "@/lib/schemas";

function garantirPermissao(ator: Ator) {
  if (!podeGerirClientes(autoridadeDo(ator))) {
    throw new AppError("Seu papel não pode alterar clientes.", 403, "PROIBIDO");
  }
}

function dtoCliente(
  cliente: {
    id: string;
    nome: string;
    cnpj: string | null;
    email: string | null;
    telefone: string | null;
    endereco: string | null;
    cidade: string | null;
    uf: string | null;
    observacoes: string | null;
    inscricaoEstadual?: string | null;
    site?: string | null;
    exemplo: boolean;
    criadoEm: Date;
    contatos?: {
      id: string;
      nome: string;
      email: string | null;
      telefone: string | null;
      cargo: string | null;
      principal: boolean;
    }[];
  },
) {
  return {
    id: cliente.id,
    nome: cliente.nome,
    cnpj: cliente.cnpj,
    cnpjFormatado: formatarCnpj(cliente.cnpj),
    email: cliente.email,
    telefone: cliente.telefone,
    endereco: cliente.endereco,
    cidade: cliente.cidade,
    uf: cliente.uf,
    observacoes: cliente.observacoes,
    inscricaoEstadual: cliente.inscricaoEstadual ?? null,
    site: cliente.site ?? null,
    exemplo: cliente.exemplo,
    criadoEm: cliente.criadoEm.toISOString(),
    contatos: cliente.contatos,
  };
}

const includeContatos = {
  contatos: { orderBy: [{ principal: "desc" as const }, { nome: "asc" as const }] },
};

export async function listarClientes(q?: string) {
  const termo = q?.trim();
  const clientes = await prisma.cliente.findMany({
    where: termo
      ? {
          OR: [
            { nome: { contains: termo, mode: "insensitive" } },
            { cnpj: { contains: termo.replace(/\D/g, "") || termo, mode: "insensitive" } },
            { cidade: { contains: termo, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { contatos: true, processos: true } } },
    orderBy: { nome: "asc" },
  });
  return clientes.map((cliente) => ({
    ...dtoCliente(cliente),
    totalContatos: cliente._count.contatos,
    totalProcessos: cliente._count.processos,
  }));
}

export async function obterCliente(id: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      ...includeContatos,
      processos: {
        select: { id: true, codigo: true, titulo: true, etapa: true, atualizadoEm: true },
        orderBy: { atualizadoEm: "desc" },
      },
    },
  });
  if (!cliente) throw new AppError("Cliente não encontrado.", 404, "NAO_ENCONTRADO");
  return {
    ...dtoCliente(cliente),
    processos: cliente.processos.map((processo) => ({
      ...processo,
      atualizadoEm: processo.atualizadoEm.toISOString(),
    })),
  };
}

export async function criarCliente(ator: Ator, dados: DadosCliente) {
  garantirPermissao(ator);
  try {
    const cliente = await prisma.cliente.create({
      data: {
        nome: dados.nome,
        cnpj: dados.cnpj ?? null,
        email: dados.email ?? null,
        telefone: dados.telefone ?? null,
        endereco: dados.endereco ?? null,
        cidade: dados.cidade ?? null,
        uf: dados.uf ?? null,
        observacoes: dados.observacoes ?? null,
        inscricaoEstadual: dados.inscricaoEstadual ?? null,
        site: dados.site ?? null,
      },
      include: includeContatos,
    });
    return dtoCliente(cliente);
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      throw new AppError("Já existe um cliente com este CNPJ.", 409, "CONFLITO");
    }
    throw erro;
  }
}

export async function atualizarCliente(ator: Ator, id: string, dados: Partial<DadosCliente>) {
  garantirPermissao(ator);
  const atual = await prisma.cliente.findUnique({ where: { id } });
  if (!atual) throw new AppError("Cliente não encontrado.", 404, "NAO_ENCONTRADO");
  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nome: dados.nome ?? undefined,
        cnpj: dados.cnpj === undefined ? undefined : dados.cnpj,
        email: dados.email === undefined ? undefined : dados.email,
        telefone: dados.telefone === undefined ? undefined : dados.telefone,
        endereco: dados.endereco === undefined ? undefined : dados.endereco,
        cidade: dados.cidade === undefined ? undefined : dados.cidade,
        uf: dados.uf === undefined ? undefined : dados.uf,
        observacoes: dados.observacoes === undefined ? undefined : dados.observacoes,
        inscricaoEstadual: dados.inscricaoEstadual === undefined ? undefined : dados.inscricaoEstadual,
        site: dados.site === undefined ? undefined : dados.site,
      },
      include: includeContatos,
    });
    return dtoCliente(cliente);
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      throw new AppError("Já existe um cliente com este CNPJ.", 409, "CONFLITO");
    }
    throw erro;
  }
}

export async function criarContato(ator: Ator, clienteId: string, dados: DadosContato) {
  garantirPermissao(ator);
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, include: { _count: { select: { contatos: true } } } });
  if (!cliente) throw new AppError("Cliente não encontrado.", 404, "NAO_ENCONTRADO");
  const principal = dados.principal ?? cliente._count.contatos === 0;
  const contato = await prisma.$transaction(async (tx) => {
    if (principal) {
      await tx.contato.updateMany({ where: { clienteId }, data: { principal: false } });
    }
    return tx.contato.create({
      data: {
        clienteId,
        nome: dados.nome,
        email: dados.email ?? null,
        telefone: dados.telefone ?? null,
        cargo: dados.cargo ?? null,
        cpf: dados.cpf ?? null,
        documento: dados.documento ?? null,
        principal,
      },
    });
  });
  return contato;
}
