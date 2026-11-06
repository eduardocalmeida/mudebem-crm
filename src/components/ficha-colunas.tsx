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

  useEffect(() => {
    function aoClicar(evento: MouseEvent) {
      const alvo = evento.target instanceof Element ? evento.target.closest("a") : null;
      if (!alvo) return;
      const url = new URL(alvo.href, window.location.href);
      if (url.pathname !== window.location.pathname) return;
      const pedida = url.searchParams.get("aba");
      if (!pedida) return;
      const destino = pedida === "tarefas" ? "resumo" : pedida === "cte" || pedida === "nfse" ? "fiscal" : pedida;
      if (destino !== "resumo" && destino !== "inventario" && destino !== "fiscal") return;
      evento.preventDefault();
      evento.stopPropagation();
      setAba(destino);
      url.searchParams.set("aba", destino);
      window.history.replaceState(null, "", url);
      if (pedida === "tarefas") document.getElementById("tarefas-oportunidade")?.scrollIntoView({ block: "start" });
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

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
