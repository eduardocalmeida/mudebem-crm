import Link from "next/link";
import { notFound } from "next/navigation";
import { FormAtribuir, FormResposta, FormVinculo } from "@/components/whatsapp-forms";
import { SeloEtapa, SeloExemplo } from "@/components/selos";
import { AppError } from "@/lib/errors";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";
import { listarModelos, obterConversa } from "@/server/whatsapp";

export const metadata = { title: "Conversa" };

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirUsuario();
  const { id } = await params;
  const conversa = await obterConversa(id, true).catch((erro: unknown) => {
    if (erro instanceof AppError && erro.status === 404) return null;
    throw erro;
  });
  if (!conversa) notFound();
  const [usuarios, modelos] = await Promise.all([
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    listarModelos(conversa.numero.id),
  ]);

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">{conversa.numero.nome} · {conversa.numero.numeroExibicao}</p>
          <h1>{conversa.nome}</h1>
          <p className="muted">
            {conversa.telefone}
            {conversa.exemplo ? <> <SeloExemplo /></> : null}
            {conversa.dentroDaJanela ? " · janela de 24h aberta" : " · janela de 24h fechada"}
          </p>
        </div>
        <Link className="btn secundario" href="/whatsapp">
          Todas as conversas
        </Link>
      </header>
      <section className="ficha">
        <article className="cartao bloco">
          <div className="fio">
            {conversa.mensagens.length === 0 ? <p className="muted">Nenhuma mensagem ainda.</p> : null}
            {conversa.mensagens.map((mensagem) => (
              <div key={mensagem.id} className={`bolha ${mensagem.direcao === "SAIDA" ? "saida" : "entrada"}`}>
                <div>{mensagem.texto || mensagem.tipoRotulo}</div>
                {mensagem.midiaId ? (
                  <a href={`/api/whatsapp/midia/${mensagem.id}`}>Abrir {mensagem.midiaNome || mensagem.tipoRotulo.toLowerCase()}</a>
                ) : null}
                <small className="muted">
                  {formatarDataHora(mensagem.criadaEm)} · {mensagem.status.toLowerCase()}
                  {mensagem.erro ? ` · ${mensagem.erro}` : ""}
                </small>
              </div>
            ))}
          </div>
          <FormResposta conversaId={conversa.id} janelaAberta={conversa.dentroDaJanela} />
          {modelos.length > 0 ? (
            <p className="muted">Modelos aprovados: {modelos.map((modelo) => `${modelo.nome} (${modelo.idioma})`).join(", ")}</p>
          ) : null}
        </article>
        <aside>
          <article className="cartao bloco">
            <h2>Atribuição</h2>
            <FormAtribuir conversaId={conversa.id} responsavelId={conversa.responsavel?.id ?? ""} usuarios={usuarios} />
          </article>
          <article className="cartao bloco">
            <h2>Processo</h2>
            {conversa.processo ? (
              <p>
                <Link href={`/processos/${conversa.processo.id}`}>
                  {conversa.processo.codigo}
                </Link>
                <br />
                <SeloEtapa etapa={conversa.processo.etapa} />
              </p>
            ) : (
              <p className="muted">Nenhum processo ligado.</p>
            )}
            <FormVinculo conversaId={conversa.id} codigo={conversa.processo?.codigo ?? ""} />
          </article>
          {conversa.contato ? (
            <article className="cartao bloco">
              <h2>Contato</h2>
              <Link href={`/clientes`}>{conversa.contato.nome}</Link>
              <p className="muted">{conversa.contato.telefone}</p>
            </article>
          ) : null}
        </aside>
      </section>
    </>
  );
}
