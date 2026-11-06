import Link from "next/link";
import type { CanalConversa } from "@prisma/client";
import { IconeCanal } from "@/components/icone-canal";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { abrirConversaAction, registrarMensagemAction } from "@/server/actions-conversa";
import { rotuloStatusConversa } from "@/server/conversas";
import { listarTarefas, tarefaAtrasada } from "@/server/tarefas";

const CANAIS_LEAD: CanalConversa[] = ["WHATSAPP", "INSTAGRAM", "EMAIL"];

export async function FichaConversa({ processoId, usuarioId, fio }: { processoId: string; usuarioId: string; fio?: string }) {
  const [conversas, tarefas] = await Promise.all([
    prisma.conversa.findMany({
      where: { processoId },
      orderBy: [{ status: "asc" }, { ultimaMensagemEm: "desc" }],
      include: { mensagens: { orderBy: { criadaEm: "asc" }, take: 40 }, whatsapp: { select: { id: true } } },
    }),
    listarTarefas({ processoId }),
  ]);
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
              {aberta.whatsapp ? <> · <Link href={`/whatsapp/${aberta.whatsapp.id}`}>Responder</Link></> : null}
            </p>
            <div className="fio fio-curto">
              {aberta.mensagens.length === 0 ? <p className="muted">Nenhuma mensagem ainda.</p> : null}
              {aberta.mensagens.map((mensagem) => (
                <div key={mensagem.id} className={mensagem.direcao === "SAIDA" ? "bolha saida" : "bolha"}>
                  <strong className="linha-icone"><IconeCanal canal={mensagem.canal} /> {mensagem.remetente || "Mensagem"}</strong>
                  <div>{mensagem.conteudo}</div>
                  <small className="muted">{formatarDataHora(mensagem.criadaEm)}</small>
                </div>
              ))}
            </div>
            <form action={registrarMensagemAction} className="grade-form uma">
              <input type="hidden" name="conversaId" value={aberta.id} />
              <input type="hidden" name="processoId" value={processoId} />
              <label className="campo">
                <span>Direção</span>
                <select name="direcao" defaultValue="SAIDA">
                  <option value="SAIDA">Saída</option>
                  <option value="ENTRADA">Entrada</option>
                </select>
              </label>
              <label className="campo largo">
                <span>Mensagem</span>
                <textarea name="conteudo" required placeholder="Registre o que foi dito" />
              </label>
              <button className="btn primario" type="submit">Registrar</button>
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
      <article className="cartao bloco">
        <h2>Tarefas</h2>
        <ul className="lista-tarefas">
          {tarefas.length === 0 ? <li className="muted">Nenhuma tarefa neste lead.</li> : null}
          {tarefas.slice(0, 6).map((tarefa) => (
            <li key={tarefa.id} className={tarefaAtrasada(tarefa.vencimento, tarefa.concluidaEm) ? "atrasada" : ""}>
              <div>
                <strong>{tarefa.titulo}</strong>
                <div className="muted">{tarefa.tipo.rotulo} · {formatarDataHora(tarefa.vencimento)}{tarefa.concluidaEm ? " · concluída" : ""}</div>
              </div>
            </li>
          ))}
        </ul>
        <p><Link href={`/processos/${processoId}?aba=tarefas`}>Ver tarefas</Link></p>
      </article>
    </section>
  );
}
