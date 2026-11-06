"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { rotuloPapel, type Papel } from "@/lib/domain";
import { sairAction } from "@/server/actions";

const LINKS = [
  { href: "/painel", rotulo: "Painel" },
  { href: "/processos", rotulo: "Processos" },
  { href: "/tarefas", rotulo: "Tarefas" },
  { href: "/mdfe", rotulo: "MDF-e" },
  { href: "/whatsapp", rotulo: "WhatsApp" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/notificacoes", rotulo: "Avisos" },
];

const CURTOS = ["/painel", "/processos", "/tarefas", "/notificacoes"];

export function BarraLateral({
  usuario,
  naoLidas = 0,
}: {
  usuario: { nome: string; email: string; papel: Papel };
  naoLidas?: number;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const itens = usuario.papel === "ADMIN"
    ? [...LINKS, { href: "/equipe", rotulo: "Equipe" }, { href: "/etapas", rotulo: "Etapas" }, { href: "/inventario", rotulo: "Catálogo" }, { href: "/contratos", rotulo: "Contratos" }, { href: "/importar", rotulo: "Importar" }, { href: "/integracoes", rotulo: "Integrações" }]
    : LINKS;
  const iniciais = usuario.nome.trim().charAt(0).toUpperCase();
  const ativo = (href: string) => caminho === href || caminho.startsWith(`${href}/`);

  return (
    <aside className="barra">
      <Link href="/painel" className="marca">
        <Logo />
      </Link>
      <nav className="menu" aria-label="Principal">
        {itens.map((item) => (
          <Link key={item.href} href={item.href} className={ativo(item.href) ? "ativo" : undefined}>
            {item.rotulo}
            {item.href === "/whatsapp" && naoLidas > 0 ? <em>{naoLidas}</em> : null}
          </Link>
        ))}
      </nav>
      <div className="barra-rodape">
        <div className="quem">
          <span className="avatar" aria-hidden>{iniciais}</span>
          <div>
            <strong>{usuario.nome}</strong>
            <small>{rotuloPapel(usuario.papel)}<br />{usuario.email}</small>
          </div>
        </div>
        <form action={sairAction}>
          <button className="btn secundario" type="submit">Sair</button>
        </form>
      </div>
      {aberto ? <button className="cortina aberta" type="button" aria-label="Fechar menu" onClick={() => setAberto(false)} /> : null}
      <nav className={aberto ? "gaveta cartao aberta" : "gaveta"} aria-label="Mais">
        {itens.filter((item) => !CURTOS.includes(item.href)).map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setAberto(false)}>{item.rotulo}</Link>
        ))}
        <form action={sairAction}><button className="btn secundario" type="submit">Sair</button></form>
      </nav>
      <nav className="nav-base" aria-label="Atalhos">
        {itens.filter((item) => CURTOS.includes(item.href)).map((item) => (
          <Link key={item.href} href={item.href} className={ativo(item.href) ? "ativo" : undefined}>{item.rotulo}</Link>
        ))}
        <button type="button" className={aberto ? "ativo" : undefined} onClick={() => setAberto((valor) => !valor)}>Mais</button>
      </nav>
    </aside>
  );
}
