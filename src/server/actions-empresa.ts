"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { salvarEmpresa } from "@/server/empresa";
import { exigirUsuario } from "@/server/session";

export async function salvarEmpresaAction(form: FormData) {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") redirect("/painel");
  const texto = (nome: string) => String(form.get(nome) || "").trim() || null;
  await salvarEmpresa({
    nome: texto("nome"),
    cnpj: texto("cnpj"),
    ie: texto("ie"),
    municipio: texto("municipio") || "Goiânia",
    uf: texto("uf") || "GO",
    codigoIbge: texto("codigoIbge") || "5208707",
  });
  revalidatePath("/integracoes");
  redirect("/integracoes");
}
