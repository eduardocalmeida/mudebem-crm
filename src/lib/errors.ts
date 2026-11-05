import { ZodError, type ZodIssue } from "zod";

export class AppError extends Error {
  status: number;
  codigo: string;

  constructor(message: string, status = 400, codigo = "DADOS_INVALIDOS") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.codigo = codigo;
  }
}

function textoIssue(issue: ZodIssue): string {
  if (issue.code === "invalid_type") {
    const caminho = issue.path.join(".") || "campo";
    return `${caminho}: informação obrigatória ou em formato inválido.`;
  }
  if (issue.code === "unrecognized_keys") {
    if (issue.keys.includes("etapa")) {
      return "Para mudar a etapa use POST /api/v1/processos/{id}/etapa.";
    }
    return `Campo não reconhecido: ${issue.keys.join(", ")}.`;
  }
  const caminho = issue.path.join(".");
  return caminho ? `${caminho}: ${issue.message}` : issue.message;
}

export function mensagemZod(erro: ZodError): string {
  return erro.issues.map(textoIssue).join(" ");
}

export function erroZod(erro: ZodError): AppError {
  return new AppError(mensagemZod(erro) || "Dados inválidos.", 400, "DADOS_INVALIDOS");
}
