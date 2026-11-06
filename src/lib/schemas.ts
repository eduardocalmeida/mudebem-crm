import { z } from "zod";
import { CANAL_IDS, PAPEL_IDS, type Canal, type Papel } from "@/lib/domain";
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

const etapaOpcional = z.union([z.string(), z.undefined()]).transform((valor) => {
  if (valor === undefined || valor.trim() === "") return undefined;
  return valor.trim();
});

const inteiroOpcional = z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((valor, ctx) => {
  if (valor === undefined) return undefined;
  if (valor === null || valor === "") return null;
  const numero = Number(String(valor).trim());
  if (!Number.isInteger(numero) || numero < 0 || numero > 3650) {
    ctx.addIssue({ code: "custom", message: "Informe um número de dias válido." });
    return z.NEVER;
  }
  return numero;
});

const booleanoOpcional = z.union([z.boolean(), z.string(), z.null(), z.undefined()]).transform((valor) => {
  if (valor === undefined) return undefined;
  if (valor === null || valor === "") return null;
  if (typeof valor === "boolean") return valor;
  const texto = valor.trim().toLowerCase();
  if (["sim", "true", "1", "yes", "necessário", "necessario"].includes(texto)) return true;
  if (["nao", "não", "false", "0", "no"].includes(texto)) return false;
  return null;
});

const contatoNovo = z
  .object({
    nome: z.string().trim().min(2, "O nome do contato precisa de ao menos 2 caracteres.").max(120),
    email: emailOpcional.optional(),
    telefone: textoOpcional(40).optional(),
    cargo: textoOpcional(80).optional(),
    cpf: textoOpcional(14).optional(),
    documento: textoOpcional(40).optional(),
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
    inscricaoEstadual: textoOpcional(30).optional(),
    site: textoOpcional(180).optional(),
  })
  .nullish();

const camposProcesso = {
  colaborador: textoOpcional(120),
  origemEndereco: textoOpcional(300),
  origemCep: textoOpcional(12),
  origemLogradouro: textoOpcional(120),
  origemNumero: textoOpcional(20),
  origemComplemento: textoOpcional(80),
  origemBairro: textoOpcional(80),
  origemCidade: textoOpcional(80),
  origemUf: ufOpcional,
  origemReferencia: textoOpcional(180),
  origemAndar: textoOpcional(40),
  origemElevador: textoOpcional(40),
  origemImovel: textoOpcional(80),
  destinoEndereco: textoOpcional(300),
  destinoCep: textoOpcional(12),
  destinoLogradouro: textoOpcional(120),
  destinoNumero: textoOpcional(20),
  destinoComplemento: textoOpcional(80),
  destinoBairro: textoOpcional(80),
  destinoCidade: textoOpcional(80),
  destinoUf: ufOpcional,
  destinoReferencia: textoOpcional(180),
  destinoAndar: textoOpcional(40),
  destinoElevador: textoOpcional(40),
  destinoImovel: textoOpcional(80),
  modalidade: textoOpcional(80),
  descricaoColeta: textoOpcional(500),
  descricaoEntrega: textoOpcional(500),
  embalagemNecessaria: booleanoOpcional,
  volume: textoOpcional(80),
  itensEspeciais: textoOpcional(4000),
  dataPretendida: dataOpcional,
  dataColeta: dataOpcional,
  dataEntrega: dataOpcional,
  dataPrevista: dataOpcional,
  dataEmissao: dataOpcional,
  diasParaColetar: inteiroOpcional,
  diasParaViagem: inteiroOpcional,
  motoristaNome: textoOpcional(120),
  motoristaPlaca: textoOpcional(12),
  motoristaAntt: textoOpcional(40),
  motoristaCnh: textoOpcional(20),
  motoristaCpf: textoOpcional(14),
  inventario: textoOpcional(8000),
  valorCotado: dinheiro,
  valorAprovado: dinheiro,
  valorFrete: dinheiro,
  valorSeguro: dinheiro,
  valorTransporte: dinheiro,
  valorTotal: dinheiro,
  formaPagamento: textoOpcional(80),
  validadeProposta: dataOpcional,
  linkProposta: textoOpcional(500),
  linkContrato: textoOpcional(500),
  linkContratoCarreteiro: textoOpcional(500),
  linkOs: textoOpcional(500),
  linkRecibo: textoOpcional(500),
  fonte: textoOpcional(80),
  utmSource: textoOpcional(120),
  utmMedium: textoOpcional(120),
  utmCampaign: textoOpcional(180),
  utmTerm: textoOpcional(180),
  utmContent: textoOpcional(180),
  fbclid: textoOpcional(180),
  gclid: textoOpcional(180),
  metaCampaignId: textoOpcional(80),
  metaAdId: textoOpcional(80),
  referrer: textoOpcional(500),
  formulario: textoOpcional(120),
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
    titulo: z
      .string()
      .trim()
      .max(180)
      .optional()
      .transform((valor, ctx) => {
        if (!valor) return undefined;
        if (valor.length < 3) {
          ctx.addIssue({ code: "custom", message: "O título precisa de ao menos 3 caracteres." });
          return z.NEVER;
        }
        return valor;
      }),
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
    inscricaoEstadual: textoOpcional(30).optional(),
    site: textoOpcional(180).optional(),
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
    cpf: textoOpcional(14).optional(),
    documento: textoOpcional(40).optional(),
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
    etapa: z.string().trim().min(1, "Informe a etapa."),
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
