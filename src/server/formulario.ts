import type { ZodError } from "zod";
import { camposDoPapel, CAMPOS, type Papel } from "@/lib/domain";
import { AppError, mensagemZod } from "@/lib/errors";
import {
  esquemaChave,
  esquemaCliente,
  esquemaContato,
  esquemaCriarProcesso,
  esquemaEtapa,
  esquemaNota,
  esquemaPatchCliente,
  esquemaPatchProcesso,
  esquemaUsuario,
} from "@/lib/schemas";

function texto(form: FormData, nome: string) {
  const valor = form.get(nome);
  return typeof valor === "string" ? valor : undefined;
}

function objeto(form: FormData, chaves: readonly string[]) {
  const bruto: Record<string, string> = {};
  for (const chave of chaves) {
    const valor = texto(form, chave);
    if (valor !== undefined) bruto[chave] = valor;
  }
  return bruto;
}

function validar<T>(resultado: { success: true; data: T } | { success: false; error: ZodError }): T {
  if (!resultado.success) throw new AppError(mensagemZod(resultado.error), 400, "DADOS_INVALIDOS");
  return resultado.data;
}

export function lerCriarProcesso(form: FormData, papel: Papel) {
  const bruto = objeto(form, CAMPOS);
  if (papel !== "ADMIN") {
    const permitidos = new Set<string>(camposDoPapel(papel));
    for (const chave of Object.keys(bruto)) {
      if (!permitidos.has(chave)) delete bruto[chave];
    }
  }
  return validar(esquemaCriarProcesso.safeParse(bruto));
}

export function lerPatchProcesso(form: FormData, papel: Papel) {
  const bruto = objeto(form, CAMPOS);
  if (papel !== "ADMIN") {
    const permitidos = new Set<string>(camposDoPapel(papel));
    for (const chave of Object.keys(bruto)) {
      if (!permitidos.has(chave)) delete bruto[chave];
    }
  }
  return validar(esquemaPatchProcesso.safeParse(bruto));
}

const CHAVES_CLIENTE = ["nome", "cnpj", "email", "telefone", "endereco", "cidade", "uf", "observacoes"] as const;

export function lerCliente(form: FormData) {
  return validar(esquemaCliente.safeParse(objeto(form, CHAVES_CLIENTE)));
}

export function lerPatchCliente(form: FormData) {
  return validar(esquemaPatchCliente.safeParse(objeto(form, CHAVES_CLIENTE)));
}

export function lerContato(form: FormData) {
  return validar(
    esquemaContato.safeParse({
      nome: texto(form, "nome"),
      email: texto(form, "email"),
      telefone: texto(form, "telefone"),
      cargo: texto(form, "cargo"),
      principal: texto(form, "principal"),
    }),
  );
}

export function lerNota(form: FormData) {
  return validar(esquemaNota.safeParse({ texto: texto(form, "texto") ?? "" }));
}

export function lerEtapa(form: FormData) {
  return validar(esquemaEtapa.safeParse({ etapa: texto(form, "etapa") ?? "", observacao: texto(form, "observacao") }));
}

export function lerUsuario(form: FormData) {
  return validar(
    esquemaUsuario.safeParse({
      nome: texto(form, "nome"),
      email: texto(form, "email"),
      papel: texto(form, "papel"),
      senha: texto(form, "senha"),
    }),
  );
}

export function lerChave(form: FormData) {
  return validar(esquemaChave.safeParse({ nome: texto(form, "nome") ?? "" }));
}
