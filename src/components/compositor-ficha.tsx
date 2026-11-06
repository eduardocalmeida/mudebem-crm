"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { CampoVencimento } from "@/components/campo-vencimento";
import type { EstadoForm } from "@/lib/estado";
import { registrarHistoricoFichaAction } from "@/server/actions-conversa";
import { notaAction } from "@/server/actions";
import { criarTarefaFichaAction } from "@/server/actions-operacao";

type Modo = "bate-papo" | "nota" | "tarefa";

export function CompositorFicha({
  processoId,
  conversaId,
  whatsappId,
  tipos,
  usuarios,
  responsavelInicial,
}: {
  processoId: string;
  conversaId: string | null;
  whatsappId: string | null;
  tipos: { id: string; rotulo: string }[];
  usuarios: { id: string; nome: string }[];
  responsavelInicial: string;
}) {
  const [modo, setModo] = useState<Modo>("bate-papo");
  const [textoHistorico, setTextoHistorico] = useState("");
  const [textoNota, setTextoNota] = useState("");
  const [tituloTarefa, setTituloTarefa] = useState("");
  const [historico, enviarHistorico, pendenteHistorico] = useActionState(registrarHistoricoFichaAction, {} as EstadoForm);
  const [nota, enviarNota, pendenteNota] = useActionState(notaAction, {} as EstadoForm);
  const [tarefa, enviarTarefa, pendenteTarefa] = useActionState(criarTarefaFichaAction, {} as EstadoForm);

  return (
    <section className="compositor-unico" aria-label="Compositor">
      <div className="modos" role="tablist" aria-label="Tipo de registro">
        {(
          [
            ["bate-papo", "Bate-papo"],
            ["nota", "Nota"],
            ["tarefa", "Tarefa"],
          ] as const
        ).map(([id, rotulo]) => (
          <button key={id} type="button" role="tab" aria-selected={modo === id} className={modo === id ? "ativo" : ""} onClick={() => setModo(id)}>
            {rotulo}
          </button>
        ))}
      </div>
      {modo === "bate-papo" ? (
        <form action={enviarHistorico}>
          <p className="aviso-registro">Registro no histórico. Não envia WhatsApp, e-mail nem Instagram e não marca entrega ou leitura.</p>
          <input type="hidden" name="processoId" value={processoId} />
          <input type="hidden" name="conversaId" value={conversaId ?? ""} />
          <textarea name="conteudo" value={textoHistorico} onChange={(evento) => setTextoHistorico(evento.target.value)} placeholder="Anote o que foi dito" aria-label="Texto do histórico" />
          <div className="linha">
            <button className="btn primario" type="submit" disabled={pendenteHistorico || !conversaId}>
              Registrar no histórico
            </button>
            {whatsappId ? (
              <Link className="btn secundario" href={`/whatsapp/${whatsappId}`}>
                Responder no WhatsApp
              </Link>
            ) : null}
          </div>
          {!conversaId ? <p className="muted">Abra um canal acima para registrar.</p> : null}
          {historico.erro ? <p className="alerta" role="alert">{historico.erro}</p> : null}
          {historico.ok ? <p className="ok">{historico.ok}</p> : null}
        </form>
      ) : null}
      {modo === "nota" ? (
        <form action={enviarNota}>
          <p className="aviso-registro">Nota interna. Fica no histórico do processo, fora do fio da conversa.</p>
          <input type="hidden" name="processoId" value={processoId} />
          <textarea name="texto" value={textoNota} onChange={(evento) => setTextoNota(evento.target.value)} placeholder="Nota interna" aria-label="Nota interna" required />
          <button className="btn primario" type="submit" disabled={pendenteNota}>
            Salvar nota
          </button>
          {nota.erro ? <p className="alerta" role="alert">{nota.erro}</p> : null}
          {nota.ok ? <p className="ok">{nota.ok}</p> : null}
        </form>
      ) : null}
      {modo === "tarefa" ? (
        <form action={enviarTarefa} className="grade-form">
          <p className="aviso-registro">Cria uma tarefa deste processo. Ela aparece no resumo.</p>
          <input type="hidden" name="processoId" value={processoId} />
          <label className="campo">
            <span>Tipo</span>
            <select name="tipoId" defaultValue={tipos[0]?.id}>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="campo largo">
            <span>Descrição</span>
            <input name="titulo" value={tituloTarefa} onChange={(evento) => setTituloTarefa(evento.target.value)} required placeholder="O que precisa ser feito" />
          </label>
          <CampoVencimento obrigatorio />
          <label className="campo">
            <span>Responsável</span>
            <select name="responsavelId" defaultValue={responsavelInicial}>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </select>
          </label>
          <button className="btn primario" type="submit" disabled={pendenteTarefa}>
            Criar tarefa
          </button>
          {tarefa.erro ? <p className="alerta" role="alert">{tarefa.erro}</p> : null}
          {tarefa.ok ? <p className="ok">{tarefa.ok}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
