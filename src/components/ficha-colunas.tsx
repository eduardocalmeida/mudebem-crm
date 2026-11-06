"use client";

import { useEffect, useState, type ReactNode } from "react";

const ABAS = [
  { id: "resumo", rotulo: "Resumo" },
  { id: "inventario", rotulo: "Inventário" },
  { id: "fiscal", rotulo: "Fiscal" },
] as const;

export function FichaColunas({
  inicial,
  rolarTarefas,
  resumo,
  inventario,
  fiscal,
  conversa,
}: {
  inicial: string;
  rolarTarefas: boolean;
  resumo: ReactNode;
  inventario: ReactNode;
  fiscal: ReactNode;
  conversa: ReactNode;
}) {
  const [aba, setAba] = useState(inicial === "tarefas" || inicial === "cte" || inicial === "nfse" ? (inicial === "tarefas" ? "resumo" : "fiscal") : inicial);

  useEffect(() => {
    if (rolarTarefas) document.getElementById("tarefas-oportunidade")?.scrollIntoView({ block: "start" });
  }, [rolarTarefas]);

  function escolher(id: string) {
    setAba(id);
    const url = new URL(window.location.href);
    url.searchParams.set("aba", id);
    window.history.replaceState(null, "", url);
  }

  const paineis = [
    { id: "resumo", conteudo: resumo },
    { id: "inventario", conteudo: inventario },
    { id: "fiscal", conteudo: fiscal },
  ];

  return (
    <section className="ficha ficha-persistente">
      <div>
        <nav className="abas" aria-label="Seções da ficha">
          {ABAS.map((item) => (
            <button key={item.id} type="button" className={aba === item.id ? "ativa" : ""} aria-pressed={aba === item.id} onClick={() => escolher(item.id)}>
              {item.rotulo}
            </button>
          ))}
        </nav>
        {paineis.map((painel) => (
          <div key={painel.id} hidden={aba !== painel.id}>
            {painel.conteudo}
          </div>
        ))}
      </div>
      <aside>{conversa}</aside>
    </section>
  );
}
