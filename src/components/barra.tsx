"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { rotuloPapel, type Papel } from "@/lib/domain";
import { sairAction } from "@/server/actions";

type IconeNome = "casa" | "funil" | "calendario" | "comunicacao" | "listas" | "equipe" | "etapas" | "inventario" | "contratos" | "importar" | "integracoes" | "engrenagem" | "sair" | "mais" | "menu";

const PRINCIPAL: { href: string; rotulo: string; icone: IconeNome }[] = [
  { href: "/painel", rotulo: "Início", icone: "casa" },
  { href: "/processos", rotulo: "Oportunidades", icone: "funil" },
  { href: "/tarefas", rotulo: "Calendário", icone: "calendario" },
  { href: "/whatsapp", rotulo: "Comunicação", icone: "comunicacao" },
  { href: "/clientes", rotulo: "Listas", icone: "listas" },
];

const CONFIG: { href: string; rotulo: string; icone: IconeNome }[] = [
  { href: "/equipe", rotulo: "Equipe", icone: "equipe" },
  { href: "/etapas", rotulo: "Etapas", icone: "etapas" },
  { href: "/inventario", rotulo: "Inventário", icone: "inventario" },
  { href: "/contratos", rotulo: "Contratos", icone: "contratos" },
  { href: "/importar", rotulo: "Importar", icone: "importar" },
  { href: "/integracoes", rotulo: "Conexões e APIs", icone: "integracoes" },
];

export function BarraLateral({
  usuario,
  naoLidas = 0,
}: {
  usuario: { nome: string; email: string; papel: Papel };
  naoLidas?: number;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const config = usuario.papel === "ADMIN" ? CONFIG : [];
  const iniciais = usuario.nome.trim().charAt(0).toUpperCase();
  const ativo = (href: string) => {
    if (href === "/processos") {
      return caminho === "/processos" || (caminho.startsWith("/processos/") && !caminho.startsWith("/processos/novo"));
    }
    if (href === "/whatsapp") {
      return (caminho === "/whatsapp" || caminho.startsWith("/whatsapp/")) && !caminho.startsWith("/whatsapp/ajustes");
    }
    return caminho === href || caminho.startsWith(`${href}/`);
  };
  const emConfig = config.some((item) => ativo(item.href));
  const [configAberta, setConfigAberta] = useState(emConfig);
  useEffect(() => {
    setConfigAberta(emConfig);
  }, [caminho, emConfig]);
  return (
    <aside className="barra">
      <Link href="/painel" className="marca" aria-label="Início">
        <Logo />
      </Link>
      <nav className="menu" aria-label="Principal">
        {PRINCIPAL.map((item) => (
          <Link key={item.href} href={item.href} className={ativo(item.href) ? "ativo" : undefined} title={item.rotulo}>
            <Icone nome={item.icone} />
            <span className="rotulo">{item.rotulo}</span>
            {item.href === "/whatsapp" && naoLidas > 0 ? <em>{naoLidas}</em> : null}
          </Link>
        ))}
        {config.length > 0 ? (
          <div className="menu-secao">
            <button
              type="button"
              className={emConfig ? "ativo" : undefined}
              aria-expanded={configAberta}
              title="Configuração"
              onClick={() => setConfigAberta((valor) => !valor)}
            >
              <Icone nome="engrenagem" />
              <span className="rotulo">Configuração</span>
            </button>
            <div className={configAberta ? "submenu-config aberto" : "submenu-config"}>
              {config.map((item) => (
                <Link key={item.href} href={item.href} className={ativo(item.href) ? "ativo" : undefined} title={item.rotulo}>
                  <Icone nome={item.icone} />
                  <span className="rotulo">{item.rotulo}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </nav>
      <div className="barra-rodape">
        <div className="quem">
          <span className="avatar" aria-hidden>{iniciais}</span>
          <div className="quem-texto">
            <strong>{usuario.nome}</strong>
            <small>{rotuloPapel(usuario.papel)}<br />{usuario.email}</small>
          </div>
        </div>
        <form action={sairAction}>
          <button className="btn secundario btn-sair" type="submit">
            <Icone nome="sair" />
            <span>Sair</span>
          </button>
        </form>
      </div>
      {aberto ? <button className="cortina aberta" type="button" aria-label="Fechar menu" onClick={() => setAberto(false)} /> : null}
      <nav className={aberto ? "gaveta cartao aberta" : "gaveta"} aria-label="Mais">
        <Link href="/clientes" onClick={() => setAberto(false)}>Listas</Link>
        {config.length > 0 ? (
          <>
            <button type="button" aria-expanded={configAberta} onClick={() => setConfigAberta((valor) => !valor)}>Configuração</button>
            {configAberta ? config.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setAberto(false)}>{item.rotulo}</Link>
            )) : null}
          </>
        ) : null}
        <form action={sairAction}><button className="btn secundario" type="submit">Sair</button></form>
      </nav>
      <button className="atalho-mais" type="button" aria-label="Mais opções" onClick={() => setAberto((valor) => !valor)}>
        <Icone nome="menu" />
      </button>
      <nav className="nav-base" aria-label="Principal">
        <Link href="/painel" aria-label="Início" className={ativo("/painel") ? "ativo" : undefined}><Icone nome="casa" /><span className="nav-rotulo">Início</span></Link>
        <Link href="/processos" aria-label="Oportunidades" className={ativo("/processos") ? "ativo" : undefined}><Icone nome="funil" /><span className="nav-rotulo">Leads</span></Link>
        <Link href="/processos/novo" className="nav-novo" aria-label="Novo lead"><Icone nome="mais" /><span className="nav-rotulo">Novo</span></Link>
        <Link href="/whatsapp" aria-label="Comunicação" className={ativo("/whatsapp") ? "ativo" : undefined}>
          <Icone nome="comunicacao" />
          <span className="nav-rotulo">Conversas</span>
          {naoLidas > 0 ? <em className="ponto">{naoLidas}</em> : null}
        </Link>
        <Link href="/tarefas" aria-label="Calendário" className={ativo("/tarefas") ? "ativo" : undefined}><Icone nome="calendario" /><span className="nav-rotulo">Agenda</span></Link>
      </nav>
    </aside>
  );
}

function Icone({ nome }: { nome: IconeNome }) {
  const props = {
    viewBox: "0 0 24 24",
    width: 22,
    height: 22,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "icone",
  };
  if (nome === "casa") return <svg {...props}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1z" /></svg>;
  if (nome === "funil") return <svg {...props}><path d="M4 5h16l-6 7.2V19l-4 1.5v-8.3z" /></svg>;
  if (nome === "calendario") return <svg {...props}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3.5V7M16 3.5V7M4 10h16" /></svg>;
  if (nome === "comunicacao") return <svg {...props}><path d="M5 16.5 3.5 20.5 8 18.2A8.5 8.5 0 1 0 5 16.5z" /></svg>;
  if (nome === "listas") return <svg {...props}><path d="M9 7h11M9 12h11M9 17h11" /><circle cx="5" cy="7" r="1" fill="currentColor" /><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="5" cy="17" r="1" fill="currentColor" /></svg>;
  if (nome === "equipe") return <svg {...props}><circle cx="9" cy="9" r="3" /><circle cx="16.5" cy="10" r="2.2" /><path d="M4 19c.6-2.6 2.6-4 5-4s4.4 1.4 5 4M14.5 15.2c1.6.2 3 .9 3.6 2.8" /></svg>;
  if (nome === "etapas") return <svg {...props}><path d="M5 7h9M5 12h14M5 17h6" /></svg>;
  if (nome === "inventario") return <svg {...props}><path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" /><path d="M12 12.2 20 8.5M12 12.2V20M12 12.2 4 8.5" /></svg>;
  if (nome === "contratos") return <svg {...props}><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" /><path d="M14 3.8V8h4M8.5 12.5h7M8.5 16h5" /></svg>;
  if (nome === "importar") return <svg {...props}><path d="M12 4v10M8 10.5 12 14.5 16 10.5M5 19h14" /></svg>;
  if (nome === "integracoes") return <svg {...props}><circle cx="6" cy="12" r="2.2" /><circle cx="18" cy="7" r="2.2" /><circle cx="18" cy="17" r="2.2" /><path d="M8.2 11.2 15.8 8M8.2 12.8l7.6 3.2" /></svg>;
  if (nome === "engrenagem") return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3V20.5M4.8 6.8l1.6 1.6M17.6 15.6l1.6 1.6M3.5 12h2.2M18.3 12H20.5M4.8 17.2l1.6-1.6M17.6 8.4l1.6-1.6" /></svg>;
  if (nome === "mais") return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
  if (nome === "menu") return <svg {...props}><path d="M5 7h14M5 12h14M5 17h14" /></svg>;
  return <svg {...props}><path d="M10 7 6 12l4 5M6 12h12" /></svg>;
}
