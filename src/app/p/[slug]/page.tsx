import { Logo } from "@/components/logo";
import { pedirLinkAction } from "@/server/actions-portal";
import { portalPorSlug } from "@/server/portal/portal";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import Link from "next/link";

export default async function PortalLogin({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enviado?: string; erro?: string; dev?: string }>;
}) {
  const { slug } = await params;
  const consulta = await searchParams;
  const empresa = await portalPorSlug(slug).catch((erro: unknown) => {
    if (erro instanceof AppError) return null;
    throw erro;
  });
  if (!empresa) notFound();
  return (
    <main className="portal">
      <section className="portal-hero">
        <Logo />
        <p>Nova solicitação</p>
        <h1>Sua mudança, bem planejada.</h1>
        <p>{empresa.nome}</p>
      </section>
      <section className="portal-card">
        <h2>Entrar</h2>
        {consulta.erro ? <p className="alerta">{consulta.erro}</p> : null}
        {consulta.enviado ? <p className="ok">Enviamos um link de acesso. Sem SMTP configurado, ele fica registrado na fila.</p> : null}
        {consulta.dev ? <p><Link href={consulta.dev}>Abrir o link deste ambiente</Link></p> : null}
        <form action={pedirLinkAction} className="grade-form">
          <input type="hidden" name="slug" value={empresa.slug} />
          <label className="campo">E-mail corporativo<input name="email" type="email" required placeholder="nome@atvos.com.br" /></label>
          <button className="btn" type="submit">Receber link</button>
        </form>
        <p className="muted">Google fica disponível quando GOOGLE_CLIENT_ID estiver configurado. O acesso continua exigindo um usuário autorizado da empresa.</p>
      </section>
    </main>
  );
}
