import Link from "next/link";
import { notFound } from "next/navigation";
import { FioMensagens } from "@/components/fio-mensagens";
import { IconeCanal } from "@/components/icone-canal";
import { registrarMensagemAction, statusConversaAction } from "@/server/actions-conversa";
import { obterConversa, rotuloStatusConversa } from "@/server/conversas";
import { exigirUsuario } from "@/server/session";

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirUsuario();
  const { id } = await params;
  const conversa = await obterConversa(id);
  if (!conversa) notFound();

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo linha-icone">{conversa.numero} <IconeCanal canal={conversa.canal} /></p>
          <h1>{conversa.processo?.codigo || conversa.contato?.nome || "Conversa"}</h1>
          <p className="muted">
            {rotuloStatusConversa(conversa.status)}
            {conversa.responsavel ? ` · ${conversa.responsavel.nome}` : ""}
          </p>
        </div>
        <div className="linha">
          <Link className="btn secundario" href="/whatsapp">Voltar</Link>
          {conversa.processo ? <Link className="btn secundario" href={`/processos/${conversa.processo.id}`}>{conversa.processo.codigo}</Link> : null}
          {conversa.whatsapp ? <Link className="btn primario" href={`/whatsapp/${conversa.whatsapp.id}`}>Responder no WhatsApp</Link> : null}
        </div>
      </header>
      <section className="cartao bloco">
        <FioMensagens mensagens={conversa.mensagens} />
        <form action={registrarMensagemAction} className="compositor">
          <input type="hidden" name="conversaId" value={conversa.id} />
          <p className="aviso-registro">Registro no histórico. A resposta real do WhatsApp continua na caixa do canal.</p>
          <label className="campo">
            <span className="so-leitor">Texto para o histórico</span>
            <textarea name="conteudo" required placeholder="Anote o que foi dito" />
          </label>
          <button className="btn primario" type="submit">Registrar no histórico</button>
        </form>
        <form action={statusConversaAction} className="linha">
          <input type="hidden" name="conversaId" value={conversa.id} />
          <button className="btn secundario" name="status" value="ABERTA" type="submit">Abrir</button>
          <button className="btn secundario" name="status" value="EM_ESPERA" type="submit">Em espera</button>
          <button className="btn secundario" name="status" value="FECHADA" type="submit">Fechar</button>
        </form>
      </section>
    </>
  );
}
