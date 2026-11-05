import Link from "next/link";
import { SeloExemplo } from "@/components/selos";
import { formatarDataHora } from "@/lib/format";
import { exigirUsuario } from "@/server/session";
import { listarConversas } from "@/server/whatsapp";

export const metadata = { title: "WhatsApp" };

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirUsuario();
  const sp = await searchParams;
  const naoLidas = sp.naoLidas === "sim";
  const conversas = await listarConversas({ naoLidas });

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Inbox</p>
          <h1>WhatsApp</h1>
          <p className="muted">Conversas da API oficial da Meta, ligadas a contatos e processos.</p>
        </div>
        <div className="linha">
          <Link className="btn secundario" href={naoLidas ? "/whatsapp" : "/whatsapp?naoLidas=sim"}>
            {naoLidas ? "Ver todas" : "Só não lidas"}
          </Link>
          {usuario.papel === "ADMIN" ? (
            <Link className="btn primario" href="/whatsapp/ajustes">
              Números e conexão
            </Link>
          ) : null}
        </div>
      </header>
      <section className="cartao">
        {conversas.length === 0 ? <p className="vazio">Nenhuma conversa por aqui.</p> : null}
        <div className="conversas">
          {conversas.map((conversa) => (
            <Link
              key={conversa.id}
              href={`/whatsapp/${conversa.id}`}
              className={`conversa-item${conversa.naoLida ? " nao-lida" : ""}`}
            >
              <div className="linha">
                <strong>{conversa.nome}</strong>
                <span className="muted">{conversa.ultimaMensagemEm ? formatarDataHora(conversa.ultimaMensagemEm) : ""}</span>
              </div>
              <div className="muted">{conversa.telefone} · {conversa.numero.nome}</div>
              <div>{conversa.ultimaMensagem || "Sem mensagens"} {conversa.exemplo ? <SeloExemplo /> : null}</div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
