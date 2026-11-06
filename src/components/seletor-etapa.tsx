"use client";

import { useEffect, useState } from "react";
import { moverEtapaAction } from "@/server/actions";

export function RolarPara({ id, ativo }: { id: string; ativo: boolean }) {
  useEffect(() => {
    if (ativo) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [ativo, id]);
  return null;
}

type Opcao = { id: string; rotulo: string };

export function SeletorEtapa({
  processoId,
  atual,
  rotuloAtual,
  destinos,
}: {
  processoId: string;
  atual: string;
  rotuloAtual: string;
  destinos: Opcao[];
}) {
  const [etapa, setEtapa] = useState(atual);
  const [rotulo, setRotulo] = useState(rotuloAtual);
  const [opcoes, setOpcoes] = useState(destinos);
  const [erro, setErro] = useState("");
  const [pendente, setPendente] = useState(false);

  async function mudar(proxima: string) {
    if (proxima === etapa || pendente) return;
    setPendente(true);
    setErro("");
    const resultado = await moverEtapaAction(processoId, proxima);
    setPendente(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setEtapa(resultado.etapa);
    setRotulo(resultado.rotulo);
    setOpcoes(resultado.destinos);
  }

  if (opcoes.length === 0) {
    return (
      <p className="etapa-compacta">
        <span className="muted">Etapa atual</span> <strong>{rotulo}</strong>
      </p>
    );
  }

  return (
    <label className="etapa-compacta campo">
      <span>Etapa atual</span>
      <select aria-label="Mudar etapa" value={etapa} disabled={pendente} onChange={(evento) => mudar(evento.target.value)}>
        <option value={etapa}>{rotulo}</option>
        {opcoes.filter((item) => item.id !== etapa).map((item) => (
          <option key={item.id} value={item.id}>
            {item.rotulo}
          </option>
        ))}
      </select>
      {erro ? (
        <span className="alerta" role="alert">
          {erro}
        </span>
      ) : null}
    </label>
  );
}
