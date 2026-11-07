import { Logo } from "@/components/logo";
import { redirect } from "next/navigation";
import { decidirSolicitacaoAction } from "@/server/actions-portal";
import { formatarBRL, formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { portalPorSlug, sessaoPortal } from "@/server/portal/portal";

export default async function Gestor({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; q?: string; erro?: string }>;
}) {
  const { slug } = await params;
  const consulta = await searchParams;
  const sessao = await sessaoPortal();
  if (!sessao) redirect(`/p/${slug}`);
  const empresa = await portalPorSlug(slug);
  if (sessao.empresaId !== empresa.id || sessao.papel !== "GESTOR") redirect(`/p/${slug}/solicitar`);
  const status = consulta.status || "";
  const pedidos = await prisma.solicitacaoPortal.findMany({
    where: {
      empresaId: empresa.id,
      ...(status ? { status } : {}),
      ...(consulta.q ? { OR: [{ nome: { contains: consulta.q, mode: "insensitive" } }, { protocolo: { contains: consulta.q, mode: "insensitive" } }, { origemCidade: { contains: consulta.q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { criadoEm: "desc" },
  });
  const csv = ["protocolo,nome,data,volume,total,status", ...pedidos.map((p) => [p.protocolo, p.nome, p.dataPrevista?.toISOString().slice(0, 10) || "", p.volumeM3, p.total ?? "", p.status].join(","))].join("\n");
  return (
    <main className="portal largo">
      <header className="pagina-cabeca">
        <div>
          <Logo />
          <p className="sobretitulo">Painel administrativo</p>
          <h1>Solicitações de mudança</h1>
        </div>
        <a className="btn" href={`/p/${slug}/solicitar`}>Nova solicitação</a>
      </header>
      {consulta.erro ? <p className="alerta">{consulta.erro}</p> : null}
      <form className="linha" method="get">
        <input name="q" defaultValue={consulta.q || ""} placeholder="Buscar por nome, protocolo ou cidade" />
        <select name="status" defaultValue={status}>
          <option value="">Todos</option>
          <option value="ENVIADA">Em análise</option>
          <option value="APROVADA">Aprovada</option>
          <option value="RECUSADA">Recusada</option>
        </select>
        <button className="btn secundario" type="submit">Filtrar</button>
      </form>
      <a className="btn secundario" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="solicitacoes.csv">Exportar</a>
      <table className="tabela">
        <thead>
          <tr><th>Protocolo</th><th>Trajeto</th><th>Data</th><th>Cubagem</th><th>Total</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td>{pedido.protocolo}<div className="muted">{pedido.nome}</div></td>
              <td>{pedido.origemCidade}/{pedido.origemUf}</td>
              <td>{formatarData(pedido.dataPrevista)}</td>
              <td>{Number(pedido.volumeM3).toFixed(1).replace(".", ",")} m³</td>
              <td>{pedido.total == null ? "Análise" : formatarBRL(Number(pedido.total))}</td>
              <td>{pedido.status === "ENVIADA" ? "Em análise" : pedido.status === "APROVADA" ? "Aprovada" : "Recusada"}</td>
              <td>
                {pedido.status === "ENVIADA" ? (
                  <>
                    <form action={decidirSolicitacaoAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={pedido.id} /><input type="hidden" name="decisao" value="APROVADA" /><button className="btn" type="submit">Aprovar</button></form>
                    <form action={decidirSolicitacaoAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={pedido.id} /><input type="hidden" name="decisao" value="RECUSADA" /><input name="motivo" placeholder="Motivo" required /><button className="btn secundario" type="submit">Recusar</button></form>
                  </>
                ) : <span className="muted">{pedido.motivoRecusa || pedido.decididoPor}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
