export type SituacaoConexao = "conectado" | "pendente" | "falta";

export function situacaoSmtp(ambiente: { host: boolean; senha: boolean }): { situacao: SituacaoConexao; detalhe: string } {
  if (!ambiente.host) return { situacao: "falta", detalhe: "Nenhum servidor SMTP está definido no ambiente." };
  if (!ambiente.senha) return { situacao: "pendente", detalhe: "O servidor está indicado, mas a senha não." };
  return { situacao: "conectado", detalhe: "Servidor e senha estão definidos. A senha não aparece aqui." };
}

export function situacaoWebmania(ambiente: { token: boolean; producao: boolean }): { situacao: SituacaoConexao; detalhe: string } {
  if (!ambiente.token) {
    return { situacao: "falta", detalhe: "WEBMANIA_ACCESS_TOKEN não está definido. CT-e, MDF-e e NFS-e não saem." };
  }
  if (!ambiente.producao) {
    return { situacao: "pendente", detalhe: "Token definido. Ambiente de homologação (WEBMANIA_AMBIENTE diferente de 1)." };
  }
  return { situacao: "conectado", detalhe: "Token definido e ambiente de produção marcado." };
}

export function situacaoWhatsapp(entrada: { numeros: number; token: boolean }): { situacao: SituacaoConexao; detalhe: string } {
  if (entrada.numeros === 0 && !entrada.token) {
    return { situacao: "falta", detalhe: "Sem número com phone number id e sem token da Meta." };
  }
  if (entrada.numeros === 0) return { situacao: "pendente", detalhe: "Token presente, mas nenhum número cadastrado." };
  if (!entrada.token) return { situacao: "pendente", detalhe: "Há número, mas o token de acesso não está definido." };
  const n = entrada.numeros;
  return { situacao: "conectado", detalhe: n === 1 ? "1 número com id. O token não é exibido." : `${n} números com id. O token não é exibido.` };
}

export function situacaoChaves(ativas: number): { situacao: SituacaoConexao; detalhe: string } {
  if (ativas > 0) return { situacao: "conectado", detalhe: `${ativas} chave(s) ativa(s). Só o prefixo aparece.` };
  return { situacao: "pendente", detalhe: "Nenhuma chave ativa. Gere uma para os agentes." };
}

export function rotuloSituacao(situacao: SituacaoConexao) {
  if (situacao === "conectado") return "Conectado";
  if (situacao === "pendente") return "Pendente";
  return "Falta credencial";
}

export function mascararId(valor: string) {
  const texto = valor.trim();
  if (!texto) return "••••";
  return `••••${texto.slice(-4)}`;
}
