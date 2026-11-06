import Link from "next/link";
import { notFound } from "next/navigation";
import { IconeCanal } from "@/components/icone-canal";
import { formatarDataHora } from "@/lib/format";
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
          <h1>{conversa.processo?.titulo || conversa.contato?.nome || "Conversa"}</h1>
          <p className="muted">
            {rotuloStatusConversa(conversa.status)}
            {conversa.processo ? ` · ${conversa.processo.codigo}` : ""}
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
        <div className="fio">
          {conversa.mensagens.length === 0 ? <p className="muted">Nenhuma mensagem ainda.</p> : null}
          {conversa.mensagens.map((mensagem) => (
            <div key={mensagem.id} className={mensagem.direcao === "SAIDA" ? "bolha saida" : "bolha"}>
              <strong className="linha-icone"><IconeCanal canal={mensagem.canal} /> {mensagem.remetente || "Mensagem"}</strong>
              <div>{mensagem.conteudo}</div>
              <small className="muted">{formatarDataHora(mensagem.criadaEm)}</small>
            </div>
          ))}
        </div>
        <form action={registrarMensagemAction} className="grade-form uma">
          <input type="hidden" name="conversaId" value={conversa.id} />
          <label className="campo">
            <span>Direção</span>
            <select name="direcao" defaultValue="SAIDA">
              <option value="SAIDA">Saída</option>
              <option value="ENTRADA">Entrada</option>
            </select>
          </label>
          <label className="campo largo">
            <span>Mensagem</span>
            <textarea name="conteudo" required placeholder="O WhatsApp da Meta continua na caixa própria. Aqui entra telefone, e-mail e nota." />
          </label>
          <button className="btn primario" type="submit">Registrar</button>
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
