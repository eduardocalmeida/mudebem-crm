import Link from "next/link";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { abrirConversaAction, registrarMensagemAction } from "@/server/actions-conversa";
import { rotuloCanalConversa, rotuloStatusConversa } from "@/server/conversas";
import { listarTarefas, tarefaAtrasada } from "@/server/tarefas";

export async function FichaConversa({ processoId, usuarioId }: { processoId: string; usuarioId: string }) {
  const [conversas, tarefas] = await Promise.all([
    prisma.conversa.findMany({
      where: { processoId },
      orderBy: [{ status: "asc" }, { ultimaMensagemEm: "desc" }],
      include: { mensagens: { orderBy: { criadaEm: "asc" }, take: 40 }, whatsapp: { select: { id: true } } },
    }),
    listarTarefas({ processoId }),
  ]);
  const aberta = conversas.find((conversa) => conversa.status !== "FECHADA") ?? conversas[0];

  return (
    <section className="kommo">
      <article className="cartao bloco">
        <h2>Conversa</h2>
        {aberta ? (
          <>
            <p className="muted">
              {aberta.numero} · {rotuloCanalConversa(aberta.canal)} · {rotuloStatusConversa(aberta.status)}
              {" · "}
              <Link href={`/comunicacao/${aberta.id}`}>Abrir o fio</Link>
              {aberta.whatsapp ? <> · <Link href={`/whatsapp/${aberta.whatsapp.id}`}>Caixa WhatsApp</Link></> : null}
            </p>
            <div className="fio fio-curto">
              {aberta.mensagens.length === 0 ? <p className="muted">Nenhuma mensagem ainda.</p> : null}
              {aberta.mensagens.map((mensagem) => (
                <div key={mensagem.id} className={mensagem.direcao === "SAIDA" ? "bolha saida" : "bolha"}>
                  <strong>{mensagem.remetente || rotuloCanalConversa(mensagem.canal)}</strong>
                  <div>{mensagem.conteudo}</div>
                  <small className="muted">{formatarDataHora(mensagem.criadaEm)} · {rotuloCanalConversa(mensagem.canal)}</small>
                </div>
              ))}
            </div>
            <form action={registrarMensagemAction} className="grade-form uma">
              <input type="hidden" name="conversaId" value={aberta.id} />
              <input type="hidden" name="processoId" value={processoId} />
              <label className="campo">
                <span>Canal</span>
                <select name="canal" defaultValue={aberta.canal === "WHATSAPP" ? "TELEFONE" : aberta.canal}>
                  <option value="TELEFONE">Telefone</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>
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
          <form action={abrirConversaAction}>
            <input type="hidden" name="processoId" value={processoId} />
            <input type="hidden" name="responsavelId" value={usuarioId} />
            <p className="muted">Esta oportunidade ainda não tem uma conversa.</p>
            <button className="btn primario" type="submit">Abrir conversa</button>
          </form>
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
