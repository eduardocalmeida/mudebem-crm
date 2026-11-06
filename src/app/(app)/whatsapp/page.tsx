import Link from "next/link";
import { IconeCanal } from "@/components/icone-canal";
import { formatarDataHora } from "@/lib/format";
import { exigirUsuario } from "@/server/session";
import { listarConversasAbertas, rotuloStatusConversa } from "@/server/conversas";

export const metadata = { title: "Comunicação" };

export default async function WhatsappPage() {
  await exigirUsuario();
  const abertas = await listarConversasAbertas();

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Leads</p>
          <h1>Comunicação</h1>
          <p className="muted">Cada fio pertence a um lead. O canal aparece no ícone da conversa e de cada mensagem.</p>
        </div>
      </header>
      <section className="cartao">
        {abertas.length === 0 ? <p className="vazio">Nenhuma conversa aberta.</p> : null}
        <div className="conversas">
          {abertas.map((conversa) => (
            <Link key={conversa.id} href={`/comunicacao/${conversa.id}`} className={`conversa-item${conversa.naoLida ? " nao-lida" : ""}`}>
              <IconeCanal canal={conversa.canal} />
              <div>
                <div className="linha">
                  <strong>{conversa.processo?.codigo || conversa.contato?.nome || conversa.whatsapp?.nomeContato || "Sem lead"}</strong>
                  <span className="muted">{conversa.ultimaMensagemEm ? formatarDataHora(conversa.ultimaMensagemEm) : ""}</span>
                </div>
                <div className="muted">{conversa.numero} · {rotuloStatusConversa(conversa.status)}{conversa.processo ? ` · ${conversa.processo.codigo}` : ""}</div>
                <div>{conversa.ultimaMensagem || "Sem mensagens"}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
