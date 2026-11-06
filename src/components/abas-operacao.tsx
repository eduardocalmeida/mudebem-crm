import Link from "next/link";
import { COMODOS } from "@/server/catalogo-mudanca";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  adicionarInventarioAction,
  concluirTarefaAction,
  criarTarefaAction,
  removerInventarioAction,
} from "@/server/actions-operacao";
import { listarCatalogo, obterInventario } from "@/server/inventario";
import { listarTarefas, tarefaAtrasada } from "@/server/tarefas";

export async function AbaInventario({ processoId }: { processoId: string }) {
  const [inventario, catalogo] = await Promise.all([obterInventario(processoId), listarCatalogo()]);
  const grupos = new Map<string, typeof catalogo>();
  for (const item of catalogo) {
    const lista = grupos.get(item.categoria) ?? [];
    lista.push(item);
    grupos.set(item.categoria, lista);
  }
  return (
    <section className="cartao painel-aba">
      <h2>Inventário</h2>
      <p className="muted">
        {inventario.totais.quantidade} itens · <strong>{inventario.volume}</strong>. Esse total alimenta o campo Volume do processo.
      </p>
      <table className="tabela">
        <thead>
          <tr>
            <th>Item</th>
            <th>Cômodo</th>
            <th>Qtd</th>
            <th>m³</th>
            <th>Marcas</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {inventario.itens.map((item) => (
            <tr key={item.id}>
              <td>{item.nome}</td>
              <td>{COMODOS.find((comodo) => comodo.id === item.comodo)?.rotulo ?? item.comodo}</td>
              <td>{item.quantidade}</td>
              <td>{item.volumeTotal.toFixed(2).replace(".", ",")}</td>
              <td className="muted">
                {[item.fragil ? "frágil" : "", item.desmontagem ? "desmontagem" : "", item.embalagem ? "embalagem" : ""]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </td>
              <td>
                <form action={removerInventarioAction}>
                  <input type="hidden" name="processoId" value={processoId} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <button className="btn secundario" type="submit">
                    Remover
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form action={adicionarInventarioAction} className="grade-form">
        <input type="hidden" name="processoId" value={processoId} />
        <label>
          Do catálogo
          <select name="catalogoId" defaultValue="">
            <option value="">Item personalizado</option>
            {[...grupos.entries()].map(([categoria, itens]) => (
              <optgroup key={categoria} label={categoria}>
                {itens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} ({item.volumeM3.toNumber().toFixed(2)} m³)
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          Ou nome próprio
          <input name="nome" placeholder="Piano de cauda" />
        </label>
        <label>
          Volume próprio (m³)
          <input name="volumeM3" inputMode="decimal" placeholder="2,50" />
        </label>
        <label>
          Cômodo
          <select name="comodo" defaultValue="SALA">
            {COMODOS.map((comodo) => (
              <option key={comodo.id} value={comodo.id}>
                {comodo.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantidade
          <input name="quantidade" type="number" min={1} defaultValue={1} />
        </label>
        <label className="check">
          <input type="checkbox" name="fragil" /> Frágil
        </label>
        <label className="check">
          <input type="checkbox" name="desmontagem" /> Desmontagem/montagem
        </label>
        <label className="check">
          <input type="checkbox" name="embalagem" /> Embalagem necessária
        </label>
        <button className="btn" type="submit">
          Adicionar item
        </button>
      </form>
    </section>
  );
}

export async function AbaTarefas({ processoId }: { processoId: string }) {
  const [tarefas, tipos, usuarios] = await Promise.all([
    listarTarefas({ processoId }),
    prisma.tipoTarefa.findMany({ where: { ativo: true }, orderBy: { rotulo: "asc" } }),
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  return (
    <section className="cartao painel-aba">
      <h2>Tarefas</h2>
      <ul className="lista-tarefas">
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
              <form action={concluirTarefaAction}>
                <input type="hidden" name="id" value={tarefa.id} />
                <button className="btn secundario" type="submit">
                  Concluir
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <form action={criarTarefaAction} className="grade-form">
        <input type="hidden" name="processoId" value={processoId} />
        <label>
          Tipo
          <select name="tipoId" defaultValue={tipos[0]?.id}>
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label>
          Título
          <input name="titulo" required placeholder="Ligar para confirmar a coleta" />
        </label>
        <label>
          Vencimento
          <input name="vencimento" required placeholder="dd/mm/aaaa hh:mm" />
        </label>
        <label>
          Responsável
          <select name="responsavelId">
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" type="submit">
          Criar tarefa
        </button>
      </form>
    </section>
  );
}

