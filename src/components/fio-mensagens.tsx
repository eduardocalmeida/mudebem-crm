import type { CanalConversa } from "@prisma/client";
import { IconeCanal } from "@/components/icone-canal";
import { agruparPorDia } from "@/lib/fio";
import { formatarData, horaSaoPaulo } from "@/lib/format";

export type MensagemFio = {
  id: string;
  direcao: "ENTRADA" | "SAIDA";
  conteudo: string;
  remetente: string | null;
  canal: CanalConversa;
  criadaEm: Date;
};

export function FioMensagens({ mensagens, curto = false }: { mensagens: MensagemFio[]; curto?: boolean }) {
  const grupos = agruparPorDia(mensagens);
  return (
    <div className={curto ? "fio fio-curto" : "fio"} aria-label="Mensagens da conversa">
      {mensagens.length === 0 ? <p className="muted">Nenhuma mensagem ainda.</p> : null}
      {grupos.map((grupo) => (
        <div key={grupo.dia} className="grupo-dia">
          <p className="divisor-dia">
            <time dateTime={grupo.dia}>{formatarData(grupo.dia)}</time>
          </p>
          {grupo.mensagens.map((mensagem) => (
            <article key={mensagem.id} className={mensagem.direcao === "SAIDA" ? "bolha saida" : "bolha entrada"}>
              <header className="bolha-meta">
                <IconeCanal canal={mensagem.canal} />
                {mensagem.remetente ? <strong>{mensagem.remetente}</strong> : null}
                <time dateTime={mensagem.criadaEm.toISOString()}>{horaSaoPaulo(mensagem.criadaEm)}</time>
              </header>
              <p>{mensagem.conteudo}</p>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}
