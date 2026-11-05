"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { rotuloPapel, type Papel } from "@/lib/domain";
import { sairAction } from "@/server/actions";

const LINKS = [
  { href: "/painel", rotulo: "Painel" },
  { href: "/processos", rotulo: "Processos" },
  { href: "/whatsapp", rotulo: "WhatsApp" },
  { href: "/clientes", rotulo: "Clientes" },
];

export function BarraLateral({
  usuario,
  naoLidas = 0,
}: {
  usuario: { nome: string; email: string; papel: Papel };
  naoLidas?: number;
}) {
  const caminho = usePathname();
  const itens = usuario.papel === "ADMIN" ? [...LINKS, { href: "/equipe", rotulo: "Equipe" },
    { href: "/etapas", rotulo: "Etapas" },
    { href: "/importar", rotulo: "Importar" },
    { href: "/integracoes", rotulo: "Integrações" },
  ] : LINKS;
  const inicial = usuario.nome.trim().charAt(0).toUpperCase();

  return (
    <aside className="barra">
      <Link href="/painel" className="marca">
        <span className="marca-selo" aria-hidden>
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <path d="M5 23h22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8 23V14h7l2 3h8v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M20 8l5 3.4L20 14.8" stroke="#C45C26" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>
          <strong>Mude Bem</strong>
          <span>Mudanças e Logística</span>
        </span>
      </Link>
      <nav className="menu" aria-label="Principal">
        {itens.map((item) => {
          const ativo = caminho === item.href || caminho.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={ativo ? "ativo" : undefined}>
              {item.rotulo}
              {item.href === "/whatsapp" && naoLidas > 0 ? <em>{naoLidas}</em> : null}
            </Link>
          );
        })}
      </nav>
      <div className="barra-rodape">
        <div className="quem">
          <span className="avatar" aria-hidden>
            {inicial}
          </span>
          <div>
            <strong>{usuario.nome}</strong>
            <small>
              {rotuloPapel(usuario.papel)}
              <br />
              {usuario.email}
            </small>
          </div>
        </div>
        <form action={sairAction}>
          <button className="btn secundario" type="submit">
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
