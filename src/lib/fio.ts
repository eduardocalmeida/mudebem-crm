import { diaSaoPaulo } from "@/lib/format";

export function agruparPorDia<T extends { criadaEm: Date }>(mensagens: T[]) {
  const grupos: { dia: string; mensagens: T[] }[] = [];
  for (const mensagem of mensagens) {
    const dia = diaSaoPaulo(mensagem.criadaEm);
    const ultimo = grupos.at(-1);
    if (!ultimo || ultimo.dia !== dia) grupos.push({ dia, mensagens: [mensagem] });
    else ultimo.mensagens.push(mensagem);
  }
  return grupos;
}
