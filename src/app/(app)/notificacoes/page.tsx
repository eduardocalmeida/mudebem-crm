import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";
import { formatarDataHora } from "@/lib/format";
import Link from "next/link";

export const metadata = { title: "Avisos" };

export default async function NotificacoesPage() {
  await exigirUsuario();
  const avisos = await prisma.notificacao.findMany({ orderBy: { criadoEm: "desc" }, take: 50 });
  await prisma.notificacao.updateMany({ data: { lida: true } });
  return (
    <>
      <header className="pagina-cabeca"><div><p className="sobretitulo">CRM</p><h1>Avisos do portal</h1></div></header>
      <ul className="lista-tarefas">
        {avisos.map((aviso) => (
          <li key={aviso.id}>
            <div>
              <strong>{aviso.titulo}</strong>
              <div>{aviso.mensagem}</div>
              <small className="muted">{formatarDataHora(aviso.criadoEm)} {aviso.processoId ? <Link href={`/processos/${aviso.processoId}`}>abrir processo</Link> : null}</small>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
