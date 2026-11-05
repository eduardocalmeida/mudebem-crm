import bcrypt from "bcryptjs";

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
