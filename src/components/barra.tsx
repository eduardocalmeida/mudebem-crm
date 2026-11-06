"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { rotuloPapel, type Papel } from "@/lib/domain";
import { sairAction } from "@/server/actions";

type IconeNome = "casa" | "funil" | "calendario" | "comunicacao" | "listas" | "equipe" | "etapas" | "inventario" | "contratos" | "importar" | "integracoes" | "engrenagem" | "sair";

const PRINCIPAL: { href: string; rotulo: string; icone: IconeNome }[] = [
  { href: "/painel", rotulo: "Início", icone: "casa" },
  { href: "/processos", rotulo: "Funil", icone: "funil" },
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
  { href: "/integracoes", rotulo: "Integrações", icone: "integracoes" },
];

const CURTOS = ["/painel", "/processos", "/tarefas", "/whatsapp"];

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
  const ativo = (href: string) => caminho === href || caminho.startsWith(`${href}/`);
  const mais = [
    { href: "/clientes", rotulo: "Listas" },
    ...config.map((item) => ({ href: item.href, rotulo: item.rotulo })),
  ];

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
            <p className="secao-rotulo"><Icone nome="engrenagem" /> Configuração</p>
            {config.map((item) => (
              <Link key={item.href} href={item.href} className={ativo(item.href) ? "ativo" : undefined} title={item.rotulo}>
                <Icone nome={item.icone} />
                <span className="rotulo">{item.rotulo}</span>
              </Link>
            ))}
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
        {mais.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setAberto(false)}>{item.rotulo}</Link>
        ))}
        <form action={sairAction}><button className="btn secundario" type="submit">Sair</button></form>
      </nav>
      <nav className="nav-base" aria-label="Atalhos">
        {PRINCIPAL.filter((item) => CURTOS.includes(item.href)).map((item) => (
          <Link key={item.href} href={item.href} className={ativo(item.href) ? "ativo" : undefined}>
            <Icone nome={item.icone} />
            {item.rotulo}
          </Link>
        ))}
        <button type="button" className={aberto ? "ativo" : undefined} onClick={() => setAberto((valor) => !valor)}>
          <Icone nome="engrenagem" />
          Mais
        </button>
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
  return <svg {...props}><path d="M10 7 6 12l4 5M6 12h12" /></svg>;
}
