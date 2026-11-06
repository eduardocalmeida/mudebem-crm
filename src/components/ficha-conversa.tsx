import Link from "next/link";
import type { CanalConversa } from "@prisma/client";
import { FioMensagens } from "@/components/fio-mensagens";
import { IconeCanal } from "@/components/icone-canal";
import { prisma } from "@/lib/prisma";
import { abrirConversaAction, registrarMensagemAction } from "@/server/actions-conversa";
import { rotuloStatusConversa } from "@/server/conversas";

const CANAIS_LEAD: CanalConversa[] = ["WHATSAPP", "INSTAGRAM", "EMAIL"];

export async function FichaConversa({ processoId, usuarioId, fio }: { processoId: string; usuarioId: string; fio?: string }) {
  const conversas = await prisma.conversa.findMany({
    where: { processoId },
    orderBy: [{ status: "asc" }, { ultimaMensagemEm: "desc" }],
    include: { mensagens: { orderBy: { criadaEm: "asc" }, take: 80 }, whatsapp: { select: { id: true } } },
  });
  const aberta = conversas.find((conversa) => conversa.id === fio) ?? conversas.find((conversa) => conversa.status !== "FECHADA") ?? conversas[0];
  const faltam = CANAIS_LEAD.filter((canal) => !conversas.some((conversa) => conversa.canal === canal && conversa.status !== "FECHADA"));

  return (
    <section className="conversa-lateral">
      <article className="cartao bloco">
        <h2>Conversa</h2>
        {aberta ? (
          <>
            <div className="canais-fio">
              {conversas.map((conversa) => (
                <Link key={conversa.id} href={`/processos/${processoId}?fio=${conversa.id}`} className={conversa.id === aberta.id ? "ativo" : undefined} aria-label={conversa.numero}>
                  <IconeCanal canal={conversa.canal} />
                </Link>
              ))}
              {faltam.map((canal) => (
                <form key={canal} action={abrirConversaAction}>
                  <input type="hidden" name="processoId" value={processoId} />
                  <input type="hidden" name="responsavelId" value={usuarioId} />
                  <button className="canal-novo" type="submit" name="canal" value={canal} aria-label={`Abrir ${canal}`}>
                    <IconeCanal canal={canal} />
                  </button>
                </form>
              ))}
            </div>
            <p className="muted linha-icone">
              <IconeCanal canal={aberta.canal} /> {aberta.numero} · {rotuloStatusConversa(aberta.status)}
              {" · "}
              <Link href={`/comunicacao/${aberta.id}`}>Abrir o fio</Link>
              {aberta.whatsapp ? <> · <Link href={`/whatsapp/${aberta.whatsapp.id}`}>Responder no WhatsApp</Link></> : null}
            </p>
            <FioMensagens mensagens={aberta.mensagens} curto />
            <form action={registrarMensagemAction} className="compositor">
              <input type="hidden" name="conversaId" value={aberta.id} />
              <input type="hidden" name="processoId" value={processoId} />
              <p className="aviso-registro">Registro no histórico. Não envia pelo canal e não marca entrega ou leitura.</p>
              <label className="campo">
                <span className="so-leitor">Texto para o histórico</span>
                <textarea name="conteudo" required placeholder="Anote o que foi dito" />
              </label>
              <button className="btn primario" type="submit">Registrar no histórico</button>
            </form>
          </>
        ) : (
          <>
            <p className="muted">Abra um canal deste lead.</p>
            <div className="canais-fio">
              {CANAIS_LEAD.map((canal) => (
                <form key={canal} action={abrirConversaAction}>
                  <input type="hidden" name="processoId" value={processoId} />
                  <input type="hidden" name="responsavelId" value={usuarioId} />
                  <button className="canal-novo" type="submit" name="canal" value={canal} aria-label={`Abrir ${canal}`}>
                    <IconeCanal canal={canal} />
                  </button>
                </form>
              ))}
            </div>
          </>
        )}
      </article>
    </section>
  );
}
