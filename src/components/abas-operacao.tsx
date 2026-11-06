import { CampoVencimento } from "@/components/campo-vencimento";
import { ValorInventario } from "@/components/valor-inventario";
import { lerValoresInventario, montarLinhasInventario } from "@/lib/inventario-lista";
import { formatarDataHora, vencimentoParaCampo } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  ajustarInventarioAction,
  atualizarVencimentoAction,
  concluirTarefaAction,
} from "@/server/actions-operacao";
import { listarCatalogo, obterInventario } from "@/server/inventario";
import { listarTarefas, tarefaAtrasada } from "@/server/tarefas";

export async function AbaInventario({ processoId }: { processoId: string }) {
  const [inventario, catalogo, processo] = await Promise.all([
    obterInventario(processoId),
    listarCatalogo(),
    prisma.processo.findUnique({ where: { id: processoId }, select: { extras: true } }),
  ]);
  const linhas = montarLinhasInventario(
    catalogo.map((item) => ({ id: item.id, nome: item.nome, volumeM3: item.volumeM3.toNumber() })),
    inventario.itens.map((item) => ({
      id: item.id,
      nome: item.nome,
      quantidade: item.quantidade,
      volumeUnitario: item.volumeUnitario,
      catalogoId: item.catalogoId,
    })),
    lerValoresInventario(processo?.extras),
  );
  const legado = linhas.findIndex((linha) => linha.legado);
  return (
    <section className="cartao painel-aba">
      <h2>Inventário</h2>
      <p className="muted">
        {inventario.totais.quantidade} itens · <strong>{inventario.volume}</strong>. O volume usa o catálogo já cadastrado. O valor é o declarado, em reais, e não altera o frete.
      </p>
      <div className="linha-inventario muted" aria-hidden>
        <span>Item</span>
        <span />
        <span>Qtd</span>
        <span />
        <span>Valor declarado (R$)</span>
      </div>
      {linhas.map((linha, indice) => (
        <div key={linha.chave}>
          {linha.legado && indice === legado ? <h3>Fora do catálogo</h3> : null}
          <div className="linha-inventario">
            <span>{linha.nome}</span>
            <form action={ajustarInventarioAction}>
              <input type="hidden" name="processoId" value={processoId} />
              <input type="hidden" name="catalogoId" value={linha.catalogoId ?? ""} />
              <input type="hidden" name="itemId" value={linha.itemId ?? ""} />
              <button className="btn secundario" type="submit" name="delta" value="-1" aria-label={`Diminuir ${linha.nome}`}>−</button>
            </form>
            <span className="qtd">{linha.quantidade}</span>
            <form action={ajustarInventarioAction}>
              <input type="hidden" name="processoId" value={processoId} />
              <input type="hidden" name="catalogoId" value={linha.catalogoId ?? ""} />
              <input type="hidden" name="itemId" value={linha.itemId ?? ""} />
              <button className="btn secundario" type="submit" name="delta" value="1" aria-label={`Aumentar ${linha.nome}`}>+</button>
            </form>
            <ValorInventario processoId={processoId} chave={linha.chave} valor={linha.valor} nome={linha.nome} />
          </div>
        </div>
      ))}
    </section>
  );
}

export async function AbaTarefas({ processoId, ancora = "" }: { processoId: string; ancora?: string }) {
  const tarefas = await listarTarefas({ processoId });
  return (
    <section id="tarefas-oportunidade" className="cartao painel-aba" tabIndex={-1}>
      {ancora ? <span id={ancora} /> : null}
      <h2>Tarefas</h2>
      <ul className="lista-tarefas">
        {tarefas.length === 0 ? <li className="muted">Nenhuma tarefa neste lead.</li> : null}
        {tarefas.map((tarefa) => (
          <li key={tarefa.id} className={tarefaAtrasada(tarefa.vencimento, tarefa.concluidaEm) ? "atrasada" : ""}>
            <div>
              <strong>{tarefa.titulo}</strong>
              <div className="muted">
                {tarefa.tipo.rotulo} · {formatarDataHora(tarefa.vencimento)} · {tarefa.responsavel?.nome || "sem responsável"}
                {tarefa.automatica ? " · criada pela etapa" : ""}
              </div>
            </div>
            {tarefa.concluidaEm ? (
              <span className="muted">Concluída</span>
            ) : (
              <div className="linha">
                <form action={atualizarVencimentoAction} className="linha">
                  <input type="hidden" name="id" value={tarefa.id} />
                  <input type="hidden" name="processoId" value={processoId} />
                  <CampoVencimento valor={vencimentoParaCampo(tarefa.vencimento)} />
                  <button className="btn secundario" type="submit">Salvar vencimento</button>
                </form>
                <form action={concluirTarefaAction}>
                  <input type="hidden" name="id" value={tarefa.id} />
                  <button className="btn secundario" type="submit">
                    Concluir
                  </button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="muted">Nova tarefa: use Tarefa no compositor do chat.</p>
    </section>
  );
}

