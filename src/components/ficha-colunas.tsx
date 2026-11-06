"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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

type AbaDados = (typeof ABAS)[number]["id"];

function normalizar(valor: string): AbaDados {
  if (valor === "tarefas") return "resumo";
  if (valor === "cte" || valor === "nfse") return "fiscal";
  if (valor === "inventario" || valor === "fiscal" || valor === "resumo") return valor;
  return "resumo";
}

function ehAbaDados(valor: string | null): valor is AbaDados | "tarefas" | "cte" | "nfse" {
  return valor === "resumo" || valor === "inventario" || valor === "fiscal" || valor === "tarefas" || valor === "cte" || valor === "nfse";
}

export function FichaColunas({
  inicial,
  dadosIniciais,
  legenda,
  rolarTarefas,
  topo,
  resumo,
  inventario,
  fiscal,
  conversa,
  rodape,
}: {
  inicial: string;
  dadosIniciais: boolean;
  legenda: string;
  rolarTarefas: boolean;
  topo: ReactNode;
  resumo: ReactNode;
  inventario: ReactNode;
  fiscal: ReactNode;
  conversa: ReactNode;
  rodape: ReactNode;
}) {
  const [aba, setAba] = useState<AbaDados>(normalizar(inicial));
  const [area, setArea] = useState<"conversa" | "dados">(dadosIniciais ? "dados" : "conversa");
  const empurrouDados = useRef(false);

  useEffect(() => {
    if (rolarTarefas) document.getElementById("tarefas-oportunidade")?.scrollIntoView({ block: "start" });
  }, [rolarTarefas]);

  useEffect(() => {
    function gravar(destino: "conversa" | AbaDados, historico: "push" | "replace") {
      const url = new URL(window.location.href);
      url.searchParams.set("aba", destino);
      const estado = { fichaArea: destino === "conversa" ? "conversa" : "dados", fichaAba: destino };
      if (historico === "push") window.history.pushState(estado, "", url);
      else window.history.replaceState(estado, "", url);
    }
    function mostrarDados(destino: AbaDados, historico: "push" | "replace") {
      setAba(destino);
      setArea("dados");
      if (historico === "push") empurrouDados.current = true;
      gravar(destino, historico);
    }
    function aoClicar(evento: MouseEvent) {
      const alvo = evento.target instanceof Element ? evento.target.closest("a") : null;
      if (!alvo) return;
      const url = new URL(alvo.href, window.location.href);
      if (url.pathname !== window.location.pathname) return;
      const pedida = url.searchParams.get("aba");
      if (!ehAbaDados(pedida)) return;
      evento.preventDefault();
      evento.stopPropagation();
      const destino = normalizar(pedida);
      mostrarDados(destino, "replace");
      if (pedida === "tarefas") document.getElementById("tarefas-oportunidade")?.scrollIntoView({ block: "start" });
    }
    function aoPedido(evento: Event) {
      const detalhe = (evento as CustomEvent<string | { aba?: string; ancora?: string }>).detail;
      const pedido = typeof detalhe === "string" ? detalhe : detalhe?.aba;
      const ancora = typeof detalhe === "string" ? undefined : detalhe?.ancora;
      if (pedido === "resumo" || pedido === "inventario" || pedido === "fiscal") mostrarDados(pedido, "replace");
      if (ancora) window.setTimeout(() => document.getElementById(ancora)?.scrollIntoView({ block: "start" }), 0);
    }
    function aoVoltar() {
      empurrouDados.current = false;
      const pedida = new URL(window.location.href).searchParams.get("aba");
      if (!pedida || pedida === "conversa") {
        setArea("conversa");
        return;
      }
      if (!ehAbaDados(pedida)) return;
      setAba(normalizar(pedida));
      setArea("dados");
      if (pedida === "tarefas") document.getElementById("tarefas-oportunidade")?.scrollIntoView({ block: "start" });
    }
    document.addEventListener("click", aoClicar, true);
    window.addEventListener("ficha-aba", aoPedido);
    window.addEventListener("popstate", aoVoltar);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      window.removeEventListener("ficha-aba", aoPedido);
      window.removeEventListener("popstate", aoVoltar);
    };
  }, []);

  function escolher(id: AbaDados) {
    setAba(id);
    setArea("dados");
    const url = new URL(window.location.href);
    url.searchParams.set("aba", id);
    window.history.replaceState({ fichaArea: "dados", fichaAba: id }, "", url);
  }

  function abrirDados() {
    if (area === "dados") return;
    setAba(aba);
    setArea("dados");
    empurrouDados.current = true;
    const url = new URL(window.location.href);
    url.searchParams.set("aba", aba);
    window.history.pushState({ fichaArea: "dados", fichaAba: aba }, "", url);
  }

  function abrirConversa() {
    if (area === "conversa") return;
    if (empurrouDados.current) {
      empurrouDados.current = false;
      window.history.back();
      return;
    }
    setArea("conversa");
    const url = new URL(window.location.href);
    url.searchParams.set("aba", "conversa");
    window.history.pushState({ fichaArea: "conversa", fichaAba: aba }, "", url);
  }

  const paineis = [
    { id: "resumo", conteudo: resumo },
    { id: "inventario", conteudo: inventario },
    { id: "fiscal", conteudo: fiscal },
  ];

  return (
    <section className="ficha ficha-persistente" data-area={area}>
      <p className="legenda-movel">{legenda}</p>
      <div className="troca-area">
        <button type="button" aria-pressed={area === "conversa"} onClick={abrirConversa}>
          Conversa
        </button>
        <button type="button" aria-pressed={area === "dados"} onClick={abrirDados}>
          Dados
        </button>
      </div>
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
