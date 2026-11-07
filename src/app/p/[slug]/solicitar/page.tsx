import { Logo } from "@/components/logo";
import { redirect } from "next/navigation";
import { PortalWizard } from "@/components/portal-wizard";
import { listarCatalogo } from "@/server/inventario";
import { portalPorSlug, sessaoPortal } from "@/server/portal/portal";

export default async function Solicitar({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sessao = await sessaoPortal();
  if (!sessao) redirect(`/p/${slug}`);
  const empresa = await portalPorSlug(slug);
  if (sessao.empresaId !== empresa.id) redirect(`/p/${slug}`);
  const catalogo = await listarCatalogo();
  return (
    <main className="portal">
      <aside className="portal-hero">
        <Logo />
        <p>Nova solicitação</p>
        <h1>Sua mudança, bem planejada.</h1>
        <ol>
          <li>Seus dados</li>
          <li>Endereços</li>
          <li>Inventário</li>
          <li>Revisão</li>
        </ol>
      </aside>
      <PortalWizard
        slug={empresa.slug}
        email={sessao.email}
        unidades={empresa.unidades.map((unidade) => ({ id: unidade.id, nome: unidade.nome }))}
        catalogo={catalogo.map((item) => ({ id: item.id, nome: item.nome, categoria: item.categoria, volumeM3: item.volumeM3.toNumber() }))}
      />
    </main>
  );
}
