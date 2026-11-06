import { prisma } from "@/lib/prisma";

export const EMPRESA_PADRAO = {
  municipio: "Goiânia",
  uf: "GO",
  codigoIbge: "5208707",
};

export async function obterEmpresa() {
  return prisma.empresa.upsert({
    where: { id: "padrao" },
    update: {},
    create: {
      id: "padrao",
      nome: process.env.WEBMANIA_EMITENTE_NOME || null,
      cnpj: process.env.WEBMANIA_EMITENTE_CNPJ || null,
      ie: process.env.WEBMANIA_EMITENTE_IE || null,
      ...EMPRESA_PADRAO,
    },
  });
}

export async function salvarEmpresa(dados: {
  nome: string | null;
  cnpj: string | null;
  ie: string | null;
  municipio: string;
  uf: string;
  codigoIbge: string;
}) {
  await obterEmpresa();
  return prisma.empresa.update({
    where: { id: "padrao" },
    data: {
      nome: dados.nome,
      cnpj: dados.cnpj,
      ie: dados.ie,
      municipio: dados.municipio || EMPRESA_PADRAO.municipio,
      uf: (dados.uf || EMPRESA_PADRAO.uf).toUpperCase(),
      codigoIbge: dados.codigoIbge || EMPRESA_PADRAO.codigoIbge,
    },
  });
}
