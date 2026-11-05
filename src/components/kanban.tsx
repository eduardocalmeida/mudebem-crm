"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { validarTransicao, type EtapaConfig, type Papel } from "@/lib/domain";
import { moverEtapaAction } from "@/server/actions";
import { SeloExemplo } from "@/components/selos";

export type CartaoKanban = {
  id: string;
  codigo: string;
  titulo: string;
  cliente: string;
  rota: string;
  valor: string;
  coleta: string | null;
  responsavel: string | null;
  exemplo: boolean;
};

type Coluna = { id: string; rotulo: string; cor: string; cartoes: CartaoKanban[] };

export function QuadroKanban({
  colunas,
  papel,
  etapas,
}: {
  colunas: Coluna[];
  papel: Papel;
  etapas: EtapaConfig[];
}) {
  const [itens, setItens] = useState(colunas);
  const [erro, setErro] = useState<string | null>(null);
  const [movendo, setMovendo] = useState<string | null>(null);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => setItens(colunas), [colunas]);

  function etapaDo(id: string): string | null {
    return itens.find((coluna) => coluna.id === id || coluna.cartoes.some((cartao) => cartao.id === id))?.id ?? null;
  }

  async function aoSoltar(event: DragEndEvent) {
    const processoId = String(event.active.id);
    const sobre = event.over ? String(event.over.id) : null;
    if (!sobre) return;
    const destino = etapaDo(sobre);
    const origem = etapaDo(processoId);
    if (!destino || !origem || destino === origem) return;
    const motivo = validarTransicao(papel, origem, destino, etapas);
    if (motivo) {
      setErro(motivo);
      return;
    }
    const anterior = itens;
    const cartao = itens.flatMap((coluna) => coluna.cartoes).find((item) => item.id === processoId);
    if (!cartao) return;
    setItens((colunasAtuais) =>
      colunasAtuais.map((coluna) => ({
        ...coluna,
        cartoes:
          coluna.id === destino
            ? [cartao, ...coluna.cartoes.filter((item) => item.id !== processoId)]
            : coluna.cartoes.filter((item) => item.id !== processoId),
      })),
    );
    setErro(null);
    setMovendo(processoId);
    const resultado = await moverEtapaAction(processoId, destino);
    setMovendo(null);
    if (!resultado.ok) {
      setItens(anterior);
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  return (
    <DndContext sensors={sensors} onDragEnd={aoSoltar}>
      {erro ? (
        <p className="alerta" role="alert">
          {erro}
        </p>
      ) : null}
      <div className="quadro" aria-label="Quadro de processos por etapa">
        {itens.map((coluna) => (
          <ColunaKanban key={coluna.id} coluna={coluna} movendo={movendo} />
        ))}
      </div>
    </DndContext>
  );
}

function ColunaKanban({ coluna, movendo }: { coluna: Coluna; movendo: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
  return (
    <section ref={setNodeRef} className={isOver ? "coluna sobre" : "coluna"} aria-label={coluna.rotulo}>
      <header>
        <span className="cor" style={{ background: coluna.cor }} />
        <h2>{coluna.rotulo}</h2>
        <em>{coluna.cartoes.length}</em>
      </header>
      <div className="coluna-corpo">
        {coluna.cartoes.map((cartao) => (
          <Cartao key={cartao.id} cartao={cartao} movendo={movendo === cartao.id} />
        ))}
        {coluna.cartoes.length === 0 ? <p className="vazio-coluna">Nenhum processo</p> : null}
      </div>
    </section>
  );
}

function Cartao({ cartao, movendo }: { cartao: CartaoKanban; movendo: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: cartao.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <article
      ref={setNodeRef}
      style={style}
      data-codigo={cartao.codigo}
      className={`cartao-processo${isDragging ? " arrastando" : ""}${movendo ? " salvando" : ""}`}
    >
      <button type="button" className="alca" aria-label={`Arrastar ${cartao.codigo}`} {...listeners} {...attributes}>
        Arrastar
      </button>
      <Link href={`/processos/${cartao.id}`}>
        <div className="codigo">{cartao.codigo}</div>
        <strong>{cartao.titulo}</strong>
        <div className="muted">{cartao.cliente}</div>
        <div className="rota">{cartao.rota}</div>
        <div className="cartao-meta">
          <span>{cartao.valor}</span>
          <span>{cartao.coleta ?? "sem coleta"}</span>
        </div>
        <div className="cartao-meta">
          <span>{cartao.responsavel ?? "Sem responsável"}</span>
          {cartao.exemplo ? <SeloExemplo /> : null}
        </div>
      </Link>
    </article>
  );
}
