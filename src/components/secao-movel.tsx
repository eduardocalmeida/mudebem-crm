"use client";

import { useState, type ReactNode } from "react";

export function SecaoMovel({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="secao-movel">
      <button type="button" className="secao-movel-botao" aria-expanded={aberto} onClick={() => setAberto((valor) => !valor)}>
        <span>{titulo}</span>
        <span>{aberto ? "Recolher" : "Expandir"}</span>
      </button>
      <div className={aberto ? "secao-movel-corpo aberta" : "secao-movel-corpo"}>{children}</div>
    </section>
  );
}
