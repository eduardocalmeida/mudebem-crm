import { createHash, randomBytes } from "crypto";

export const CHAVE_API_EXEMPLO = "mb_live_exemplo_mudebem_demo_key_2026";

export function hashChave(chave: string): string {
  return createHash("sha256").update(chave).digest("hex");
}

export function gerarChaveApi() {
  const chave = `mb_live_${randomBytes(24).toString("base64url")}`;
  return { chave, prefixo: chave.slice(0, 16), hash: hashChave(chave) };
}
