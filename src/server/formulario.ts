import type { ZodError } from "zod";
import { camposDoPapel, CAMPOS, type Papel } from "@/lib/domain";
import { formaPagamentoDaFicha } from "@/lib/pagamento";
import { AppError, mensagemZod } from "@/lib/errors";
import { montarEndereco } from "@/server/formulario-publico";
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

function completarFicha(form: FormData, papel: Papel, bruto: Record<string, string>) {
  const podeEndereco = papel === "ADMIN" || camposDoPapel(papel).includes("origemEndereco");
  const podeContato = papel === "ADMIN" || camposDoPapel(papel).includes("contatoId");
  if (podeEndereco) {
    for (const lado of ["origem", "destino"] as const) {
      const partes = {
        cep: texto(form, `${lado}Cep`),
        logradouro: texto(form, `${lado}Logradouro`),
        numero: texto(form, `${lado}Numero`),
        complemento: texto(form, `${lado}Complemento`),
        bairro: texto(form, `${lado}Bairro`),
      };
      if (Object.values(partes).some((valor) => valor !== undefined)) {
        bruto[`${lado}Cep`] = partes.cep ?? "";
        bruto[`${lado}Logradouro`] = partes.logradouro ?? "";
        bruto[`${lado}Numero`] = partes.numero ?? "";
        bruto[`${lado}Complemento`] = partes.complemento ?? "";
        bruto[`${lado}Bairro`] = partes.bairro ?? "";
        bruto[`${lado}Endereco`] = montarEndereco({ endereco: bruto[`${lado}Endereco`], ...partes }) ?? "";
      }
    }
  }
  if (bruto.formaPagamento !== undefined) {
    const pagamento = bruto.formaPagamento.trim();
    if (!pagamento) delete bruto.formaPagamento;
    else if (!formaPagamentoDaFicha(pagamento)) throw new AppError("Escolha uma forma de pagamento da lista.", 400, "DADOS_INVALIDOS");
  }
  if (papel === "ADMIN" || camposDoPapel(papel).includes("contatoId")) {
    const vinculos = texto(form, "contatosVinculo");
    if (vinculos !== undefined) bruto.contatosVinculo = vinculos;
    const principal = texto(form, "contatoPrincipalId");
    if (principal !== undefined) bruto.contatoPrincipalId = principal;
  }
  if (papel === "ADMIN" || camposDoPapel(papel).includes("dataColeta")) {
    const embalagem = texto(form, "dataEmbalagem");
    if (embalagem !== undefined) bruto.dataEmbalagem = embalagem;
  }
  if (podeContato && texto(form, "contatoNome")?.trim()) {
    delete bruto.contatoId;
    return {
      ...bruto,
      contato: {
        nome: texto(form, "contatoNome"),
        email: texto(form, "contatoEmail"),
        telefone: texto(form, "contatoTelefone"),
        cargo: texto(form, "contatoCargo"),
        cpf: texto(form, "contatoCpf"),
        documento: texto(form, "contatoDocumento"),
      },
    };
  }
  return bruto;
}

export function lerCriarProcesso(form: FormData, papel: Papel) {
  const bruto = objeto(form, CAMPOS);
  if (papel !== "ADMIN") {
    const permitidos = new Set<string>(camposDoPapel(papel));
    for (const chave of Object.keys(bruto)) {
      if (!permitidos.has(chave)) delete bruto[chave];
    }
  }
  return validar(esquemaCriarProcesso.safeParse(completarFicha(form, papel, bruto)));
}

export function lerPatchProcesso(form: FormData, papel: Papel) {
  const bruto = objeto(form, CAMPOS);
  if (papel !== "ADMIN") {
    const permitidos = new Set<string>(camposDoPapel(papel));
    for (const chave of Object.keys(bruto)) {
      if (!permitidos.has(chave)) delete bruto[chave];
    }
  }
  return validar(esquemaPatchProcesso.safeParse(completarFicha(form, papel, bruto)));
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
