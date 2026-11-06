import { entrarPortalAction } from "@/server/actions-portal";

export default async function AcessoPortal({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  return (
    <main className="portal">
      <form action={entrarPortalAction} className="portal-card">
        <h1>Confirmar acesso</h1>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="token" value={token || ""} />
        <button className="btn" type="submit">Entrar no portal</button>
      </form>
    </main>
  );
}
