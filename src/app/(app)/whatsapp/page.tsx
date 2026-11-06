import Link from "next/link";
import { SeloExemplo } from "@/components/selos";
import { formatarDataHora } from "@/lib/format";
import { exigirUsuario } from "@/server/session";
import { listarConversas } from "@/server/whatsapp";

export const metadata = { title: "Comunicação" };

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirUsuario();
  const sp = await searchParams;
  const naoLidas = sp.naoLidas === "sim";
  const canal = sp.canal === "instagram" || sp.canal === "email" ? sp.canal : "whatsapp";
  const conversas = canal === "whatsapp" ? await listarConversas({ naoLidas }) : [];

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Canais</p>
          <h1>Comunicação</h1>
          <p className="muted">WhatsApp já entra aqui. Instagram e e-mail ficam no mesmo lugar quando forem conectados.</p>
        </div>
        {canal === "whatsapp" ? (
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
        ) : null}
      </header>
      <nav className="abas" aria-label="Canais">
        <Link className={canal === "whatsapp" ? "ativa" : undefined} href="/whatsapp">WhatsApp</Link>
        <Link className={canal === "instagram" ? "ativa" : undefined} href="/whatsapp?canal=instagram">Instagram</Link>
        <Link className={canal === "email" ? "ativa" : undefined} href="/whatsapp?canal=email">E-mail</Link>
      </nav>
      {canal !== "whatsapp" ? (
        <section className="cartao canal-vazio">
          <h2>{canal === "instagram" ? "Instagram" : "E-mail"}</h2>
          <p className="muted">Este canal ainda não está conectado. As conversas continuam no WhatsApp.</p>
        </section>
      ) : null}
      {canal === "whatsapp" ? <section className="cartao">
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
      </section> : null}
    </>
  );
}
