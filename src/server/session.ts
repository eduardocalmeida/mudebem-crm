import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Ator } from "@/lib/ator";
import { prisma } from "@/lib/prisma";
import { COOKIE_SESSAO, lerSessao, type TokenUsuario } from "@/lib/token";

export async function usuarioAtual(): Promise<TokenUsuario | null> {
  const jar = await cookies();
  const sessao = await lerSessao(jar.get(COOKIE_SESSAO)?.value);
  if (!sessao) return null;
  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.id } });
  if (!usuario || !usuario.ativo) {
    jar.delete(COOKIE_SESSAO);
    return null;
  }
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel };
}

export async function exigirUsuario() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

export function atorDoUsuario(usuario: TokenUsuario): Ator {
  return { tipo: "usuario", id: usuario.id, nome: usuario.nome, papel: usuario.papel };
}
