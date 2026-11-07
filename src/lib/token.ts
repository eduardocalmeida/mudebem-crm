import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { ehPapel, type Papel } from "@/lib/domain";

export const COOKIE_SESSAO = "mb_session";

export type TokenUsuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
};

function segredo() {
  const valor = process.env.AUTH_SECRET;
  if (!valor || valor.length < 16) {
    throw new Error("Defina AUTH_SECRET com pelo menos 16 caracteres.");
  }
  return new TextEncoder().encode(valor);
}

export async function assinarSessao(usuario: TokenUsuario): Promise<string> {
  return new SignJWT({ nome: usuario.nome, email: usuario.email, papel: usuario.papel })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuario.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(segredo());
}

export async function lerSessao(token: string | undefined | null): Promise<TokenUsuario | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.nome !== "string" || typeof payload.email !== "string") return null;
    if (typeof payload.papel !== "string" || !ehPapel(payload.papel)) return null;
    return { id: payload.sub, nome: payload.nome, email: payload.email, papel: payload.papel };
  } catch {
    return null;
  }
}

export function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
