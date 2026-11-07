import { createHash, randomBytes } from "node:crypto";
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const COOKIE_PORTAL = "mb_portal";

export type SessaoPortal = {
  id: string;
  email: string;
  nome: string;
  empresaId: string;
  papel: "COLABORADOR" | "GESTOR";
};

function segredo() {
  const valor = process.env.AUTH_SECRET;
  if (!valor || valor.length < 16) throw new Error("Defina AUTH_SECRET com pelo menos 16 caracteres.");
  return new TextEncoder().encode(valor);
}

export function novoTokenPortal() {
  const token = randomBytes(24).toString("hex");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

export async function assinarPortal(sessao: SessaoPortal) {
  return new SignJWT(sessao)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sessao.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(segredo());
}

export async function lerPortal(token: string | undefined | null): Promise<SessaoPortal | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    if (payload.papel !== "COLABORADOR" && payload.papel !== "GESTOR") return null;
    if (typeof payload.email !== "string" || typeof payload.empresaId !== "string" || typeof payload.nome !== "string") return null;
    return { id: String(payload.sub), email: payload.email, nome: payload.nome, empresaId: payload.empresaId, papel: payload.papel };
  } catch {
    return null;
  }
}
