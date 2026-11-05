import { z } from "zod";
import { CANAL_IDS, ETAPA_IDS, PAPEL_IDS, type Canal, type Etapa, type Papel } from "@/lib/domain";
import { digitosCnpjValidos, interpretarData, UFS } from "@/lib/format";

function textoOpcional(max: number) {
  return z.union([z.string(), z.null(), z.undefined()]).transform((valor, ctx) => {
    if (valor === undefined) return undefined;
    if (valor === null) return null;
    const texto = valor.trim();
    if (!texto) return null;
    if (texto.length > max) {
      ctx.addIssue({ code: "custom", message: `Use no máximo ${max} caracteres.` });
      return z.NEVER;
    }
    return texto;
  });
}

const emailOpcional = z.union([z.string(), z.null(), z.undefined()]).transform((valor, ctx) => {
  if (valor === undefined) return undefined;
  if (valor === null || valor.trim() === "") return null;
  const email = valor.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    ctx.addIssue({ code: "custom", message: "E-mail inválido." });
    return z.NEVER;
  }
  return email;
});

const ufOpcional = z.union([z.string(), z.null(), z.undefined()]).transform((valor, ctx) => {
  if (valor === undefined) return undefined;
  if (valor === null || valor.trim() === "") return null;
  const uf = valor.trim().toUpperCase();
  if (!(UFS as readonly string[]).includes(uf)) {
    ctx.addIssue({ code: "custom", message: "UF inválida. Use a sigla, como SP." });
    return z.NEVER;
  }
  return uf;
});

const dataOpcional = z.union([z.string(), z.null(), z.undefined()]).transform((valor, ctx) => {
  if (valor === undefined) return undefined;
  if (valor === null || valor.trim() === "") return null;
  const iso = interpretarData(valor);
  if (!iso) {
    ctx.addIssue({ code: "custom", message: "Data inválida. Use dd/mm/aaaa." });
    return z.NEVER;
  }
  return iso;
});

const dinheiro = z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((valor, ctx) => {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  const numero = Number(normalizado);
  if (!Number.isFinite(numero) || numero < 0 || numero > 9_999_999_999.99) {
    ctx.addIssue({ code: "custom", message: "Informe um valor em reais válido." });
    return z.NEVER;
  }
  return Math.round(numero * 100) / 100;
});

const idOpcional = z.union([z.string(), z.null(), z.undefined()]).transform((valor) => {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  const texto = valor.trim();
  return texto ? texto : null;
});

const cnpjOpcional = z.union([z.string(), z.null(), z.undefined()]).transform((valor, ctx) => {
  if (valor === undefined) return undefined;
  if (valor === null || valor.trim() === "") return null;
  const digitos = valor.replace(/\D/g, "");
  if (!digitosCnpjValidos(digitos)) {
    ctx.addIssue({ code: "custom", message: "CNPJ inválido." });
    return z.NEVER;
  }
  return digitos;
});

const canal = z.string({ required_error: "Informe o canal." }).transform((valor, ctx) => {
  if (!(CANAL_IDS as readonly string[]).includes(valor)) {
    ctx.addIssue({ code: "custom", message: "Canal inválido. Use EMAIL, SITE, WHATSAPP ou INDICACAO." });
    return z.NEVER;
  }
  return valor as Canal;
});

const etapaOpcional = z.union([z.string(), z.undefined()]).transform((valor, ctx) => {
  if (valor === undefined || valor.trim() === "") return undefined;
  if (!(ETAPA_IDS as readonly string[]).includes(valor)) {
    ctx.addIssue({ code: "custom", message: "Etapa inválida." });
    return z.NEVER;
  }
  return valor as Etapa;
});

const contatoNovo = z
  .object({
    nome: z.string().trim().min(2, "O nome do contato precisa de ao menos 2 caracteres.").max(120),
    email: emailOpcional.optional(),
    telefone: textoOpcional(40).optional(),
    cargo: textoOpcional(80).optional(),
  })
  .nullish();

const clienteNovo = z
  .object({
    nome: z.string().trim().min(2, "O nome do cliente precisa de ao menos 2 caracteres.").max(160),
    cnpj: cnpjOpcional.optional(),
    email: emailOpcional.optional(),
    telefone: textoOpcional(40).optional(),
    endereco: textoOpcional(180).optional(),
    cidade: textoOpcional(80).optional(),
    uf: ufOpcional.optional(),
  })
  .nullish();

const camposProcesso = {
  colaborador: textoOpcional(120),
  origemEndereco: textoOpcional(180),
  origemCidade: textoOpcional(80),
  origemUf: ufOpcional,
  destinoEndereco: textoOpcional(180),
  destinoCidade: textoOpcional(80),
  destinoUf: ufOpcional,
  dataColeta: dataOpcional,
  dataEntrega: dataOpcional,
  inventario: textoOpcional(8000),
  valorCotado: dinheiro,
  valorAprovado: dinheiro,
  numeroOc: textoOpcional(40),
  numeroCte: textoOpcional(60),
  numeroNf: textoOpcional(40),
  dataVencimento: dataOpcional,
  dataRecebimento: dataOpcional,
  responsavelId: idOpcional,
  contatoId: idOpcional,
  contato: contatoNovo,
};

export const esquemaCriarProcesso = z
  .object({
    titulo: z.string().trim().min(3, "O título precisa de ao menos 3 caracteres.").max(180),
    canal,
    etapa: etapaOpcional.optional(),
    clienteId: idOpcional.optional(),
    cliente: clienteNovo,
    ...camposProcesso,
  })
  .strict()
  .superRefine((dados, ctx) => {
    const clienteId = typeof dados.clienteId === "string" ? dados.clienteId : "";
    if (!clienteId && !dados.cliente?.nome) {
      ctx.addIssue({ code: "custom", message: "Informe clienteId ou cliente.nome.", path: ["cliente"] });
    }
  });

export const esquemaPatchProcesso = z
  .object({
    titulo: z.string().trim().min(3, "O título precisa de ao menos 3 caracteres.").max(180).optional(),
    canal: canal.optional(),
    clienteId: z.string().trim().min(1, "Informe o cliente.").optional(),
    ...camposProcesso,
  })
  .strict();

export const esquemaCliente = z
  .object({
    nome: z.string().trim().min(2, "O nome do cliente precisa de ao menos 2 caracteres.").max(160),
    cnpj: cnpjOpcional.optional(),
    email: emailOpcional.optional(),
    telefone: textoOpcional(40).optional(),
    endereco: textoOpcional(180).optional(),
    cidade: textoOpcional(80).optional(),
    uf: ufOpcional.optional(),
    observacoes: textoOpcional(2000).optional(),
  })
  .strict();

export const esquemaPatchCliente = esquemaCliente.partial().strict();

export const esquemaContato = z
  .object({
    nome: z.string().trim().min(2, "O nome do contato precisa de ao menos 2 caracteres.").max(120),
    email: emailOpcional.optional(),
    telefone: textoOpcional(40).optional(),
    cargo: textoOpcional(80).optional(),
    principal: z.union([z.boolean(), z.string(), z.undefined()]).transform((valor) => {
      if (valor === undefined) return undefined;
      if (typeof valor === "boolean") return valor;
      return valor === "sim" || valor === "true" || valor === "on";
    }),
  })
  .strict();

export const esquemaNota = z
  .object({
    texto: z.string().trim().min(1, "Escreva a nota.").max(5000, "A nota pode ter no máximo 5000 caracteres."),
  })
  .strict();

export const esquemaEtapa = z
  .object({
    etapa: z.string().transform((valor, ctx) => {
      if (!(ETAPA_IDS as readonly string[]).includes(valor)) {
        ctx.addIssue({ code: "custom", message: "Etapa inválida." });
        return z.NEVER;
      }
      return valor as Etapa;
    }),
    observacao: textoOpcional(2000).optional(),
  })
  .strict();

export const esquemaUsuario = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome completo.").max(120),
    email: z.string().trim().email("E-mail inválido.").transform((valor) => valor.toLowerCase()),
    papel: z.string().transform((valor, ctx) => {
      if (!(PAPEL_IDS as readonly string[]).includes(valor)) {
        ctx.addIssue({ code: "custom", message: "Papel inválido." });
        return z.NEVER;
      }
      return valor as Papel;
    }),
    senha: z.string().min(8, "A senha precisa de ao menos 8 caracteres.").max(72),
  })
  .strict();

export const esquemaChave = z
  .object({
    nome: z.string().trim().min(3, "Dê um nome para a chave.").max(80),
  })
  .strict();

export type DadosCriarProcesso = z.infer<typeof esquemaCriarProcesso>;
export type DadosPatchProcesso = z.infer<typeof esquemaPatchProcesso>;
export type DadosCliente = z.infer<typeof esquemaCliente>;
export type DadosContato = z.infer<typeof esquemaContato>;
