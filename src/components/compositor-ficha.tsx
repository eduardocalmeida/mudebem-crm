"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { CampoVencimento } from "@/components/campo-vencimento";
import { vencimentoParaCampo } from "@/lib/format";
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
  const [vencimentoTarefa, setVencimentoTarefa] = useState("");
  const [historico, enviarHistorico, pendenteHistorico] = useActionState(registrarHistoricoFichaAction, {} as EstadoForm);
  const [nota, enviarNota, pendenteNota] = useActionState(notaAction, {} as EstadoForm);
  const [tarefa, enviarTarefa, pendenteTarefa] = useActionState(criarTarefaFichaAction, {} as EstadoForm);

  return (
    <section className="compositor-unico" data-modo={modo} aria-label="Compositor">
      <p className={`selo-modo selo-modo-${modo}`}>{modo === "nota" ? "Nota interna" : modo === "tarefa" ? "Tarefa do processo" : "Histórico sem envio"}</p>
      <label className="modo-seletor">
        <span className="so-leitor">Modo do compositor</span>
        <select value={modo} onChange={(evento) => setModo(evento.target.value as Modo)} aria-label="Bate-papo, nota ou tarefa">
          <option value="bate-papo">Bate-papo</option>
          <option value="nota">Nota</option>
          <option value="tarefa">Tarefa</option>
        </select>
      </label>
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
          <div className="linha">
            <button className="btn primario" type="submit" disabled={pendenteNota}>
              Adicionar
            </button>
            <button className="btn secundario" type="button" onClick={() => setTextoNota("")}>
              Cancelar
            </button>
          </div>
          {nota.erro ? <p className="alerta" role="alert">{nota.erro}</p> : null}
          {nota.ok ? <p className="ok">{nota.ok}</p> : null}
        </form>
      ) : null}
      {modo === "tarefa" ? (
        <form action={enviarTarefa}>
          <p className="aviso-registro">Cria uma tarefa deste processo. Ela aparece no resumo.</p>
          <input type="hidden" name="processoId" value={processoId} />
          <p className="atalhos-vencimento">
            {[
              ["Após 15 minutos", 15],
              ["Após 30 minutos", 30],
              ["Em uma hora", 60],
              ["Hoje", 0],
              ["Amanhã", 60 * 24],
              ["Em 7 dias", 60 * 24 * 7],
              ["Em 30 dias", 60 * 24 * 30],
              ["Em 1 ano", 60 * 24 * 365],
            ].map(([rotulo, minutos]) => (
              <button key={rotulo} type="button" className="btn secundario" onClick={() => setVencimentoTarefa(vencimentoParaCampo(new Date(Date.now() + Number(minutos) * 60_000)))}>
                {rotulo}
              </button>
            ))}
          </p>
          <div className="linha-tarefa">
            <CampoVencimento key={vencimentoTarefa || "sem-data"} valor={vencimentoTarefa} obrigatorio />
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
          </div>
          <label className="campo">
            <span>Descrição</span>
            <textarea name="titulo" value={tituloTarefa} onChange={(evento) => setTituloTarefa(evento.target.value)} required placeholder="O que precisa ser feito" />
          </label>
          <div className="linha">
            <button className="btn primario" type="submit" disabled={pendenteTarefa}>
              Definir
            </button>
            <button className="btn secundario" type="button" onClick={() => { setTituloTarefa(""); setVencimentoTarefa(""); }}>
              Cancelar
            </button>
          </div>
          {tarefa.erro ? <p className="alerta" role="alert">{tarefa.erro}</p> : null}
          {tarefa.ok ? <p className="ok">{tarefa.ok}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
