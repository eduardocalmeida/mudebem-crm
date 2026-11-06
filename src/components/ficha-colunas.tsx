"use client";

import { useEffect, useState, type ReactNode } from "react";

export function IrParaAba({ aba, ancora, children }: { aba: "resumo" | "inventario" | "fiscal"; ancora?: string; children: ReactNode }) {
  return (
    <button type="button" className="btn secundario" onClick={() => window.dispatchEvent(new CustomEvent("ficha-aba", { detail: { aba, ancora } }))}>
      {children}
    </button>
  );
}

const ABAS = [
  { id: "resumo", rotulo: "Resumo" },
  { id: "inventario", rotulo: "Inventário" },
  { id: "fiscal", rotulo: "Fiscal" },
] as const;

export function FichaColunas({
  inicial,
  rolarTarefas,
  topo,
  resumo,
  inventario,
  fiscal,
  conversa,
  rodape,
}: {
  inicial: string;
  rolarTarefas: boolean;
  topo: ReactNode;
  resumo: ReactNode;
  inventario: ReactNode;
  fiscal: ReactNode;
  conversa: ReactNode;
  rodape: ReactNode;
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
    function aoPedido(evento: Event) {
      const detalhe = (evento as CustomEvent<string | { aba?: string; ancora?: string }>).detail;
      const destino = typeof detalhe === "string" ? detalhe : detalhe?.aba;
      const ancora = typeof detalhe === "string" ? undefined : detalhe?.ancora;
      if (destino === "resumo" || destino === "inventario" || destino === "fiscal") {
        setAba(destino);
        const url = new URL(window.location.href);
        url.searchParams.set("aba", destino);
        window.history.replaceState(null, "", url);
      }
      if (ancora) window.setTimeout(() => document.getElementById(ancora)?.scrollIntoView({ block: "start" }), 0);
    }
    document.addEventListener("click", aoClicar, true);
    window.addEventListener("ficha-aba", aoPedido);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      window.removeEventListener("ficha-aba", aoPedido);
    };
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
      <div className="coluna-dados">
        <div className="coluna-fixa">
          {topo}
          <nav className="abas" aria-label="Seções da ficha">
            {ABAS.map((item) => (
              <button key={item.id} type="button" className={aba === item.id ? "ativa" : ""} aria-pressed={aba === item.id} onClick={() => escolher(item.id)}>
                {item.rotulo}
              </button>
            ))}
          </nav>
        </div>
        <div className="coluna-rolagem">
          {paineis.map((painel) => (
            <div key={painel.id} hidden={aba !== painel.id}>
              {painel.conteudo}
            </div>
          ))}
        </div>
      </div>
      <aside>
        <div className="coluna-rolagem">{conversa}</div>
        {rodape}
      </aside>
    </section>
  );
}
