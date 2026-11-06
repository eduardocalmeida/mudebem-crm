import Link from "next/link";
import { SeloExemplo } from "@/components/selos";
import { formatarDataHora } from "@/lib/format";
import { exigirUsuario } from "@/server/session";
import { listarConversasAbertas, rotuloCanalConversa, rotuloStatusConversa } from "@/server/conversas";
import { listarConversas } from "@/server/whatsapp";

export const metadata = { title: "Comunicação" };

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirUsuario();
  const sp = await searchParams;
  const naoLidas = sp.naoLidas === "sim";
  const caixa = sp.caixa === "meta";
  const canal = sp.canal === "WHATSAPP" || sp.canal === "EMAIL" || sp.canal === "TELEFONE" || sp.canal === "OUTRO" ? sp.canal : null;
  const status = sp.status === "EM_ESPERA" || sp.status === "FECHADA" || sp.status === "TODAS" ? sp.status : "ABERTA";
  const [abertas, conversasMeta] = await Promise.all([
    caixa ? Promise.resolve([]) : listarConversasAbertas({ canal, status }),
    caixa ? listarConversas({ naoLidas }) : Promise.resolve([]),
  ]);

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Canais</p>
          <h1>Comunicação</h1>
          <p className="muted">Fios abertos de todos os canais. O WhatsApp da Meta continua na caixa própria.</p>
        </div>
        <Link className="btn secundario" href={caixa ? "/whatsapp" : "/whatsapp?caixa=meta"}>
          {caixa ? "Inbox" : "Caixa WhatsApp"}
        </Link>
      </header>
      {caixa ? null : (
        <nav className="abas" aria-label="Canais">
          <Link className={!canal && status === "ABERTA" ? "ativa" : undefined} href="/whatsapp">Abertas</Link>
          <Link className={canal === "WHATSAPP" ? "ativa" : undefined} href="/whatsapp?canal=WHATSAPP">WhatsApp</Link>
          <Link className={canal === "EMAIL" ? "ativa" : undefined} href="/whatsapp?canal=EMAIL">E-mail</Link>
          <Link className={canal === "TELEFONE" ? "ativa" : undefined} href="/whatsapp?canal=TELEFONE">Telefone</Link>
          <Link className={status === "EM_ESPERA" ? "ativa" : undefined} href="/whatsapp?status=EM_ESPERA">Em espera</Link>
          <Link className={status === "FECHADA" ? "ativa" : undefined} href="/whatsapp?status=FECHADA">Fechadas</Link>
        </nav>
      )}
      {caixa ? <section className="cartao">
        {conversasMeta.length === 0 ? <p className="vazio">Nenhuma conversa por aqui.</p> : null}
        <div className="conversas">
          {conversasMeta.map((conversa) => (
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
      </section> : (
        <section className="cartao">
          {abertas.length === 0 ? <p className="vazio">Nenhuma conversa com esse filtro.</p> : null}
          <div className="conversas">
            {abertas.map((conversa) => (
              <Link key={conversa.id} href={`/comunicacao/${conversa.id}`} className={`conversa-item${conversa.naoLida ? " nao-lida" : ""}`}>
                <div className="linha">
                  <strong>{conversa.numero} · {conversa.contato?.nome || conversa.whatsapp?.nomeContato || conversa.processo?.titulo || "Sem nome"}</strong>
                  <span className="muted">{conversa.ultimaMensagemEm ? formatarDataHora(conversa.ultimaMensagemEm) : ""}</span>
                </div>
                <div className="muted">{rotuloCanalConversa(conversa.canal)} · {rotuloStatusConversa(conversa.status)}{conversa.processo ? ` · ${conversa.processo.codigo}` : ""}</div>
                <div>{conversa.ultimaMensagem || "Sem mensagens"}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
