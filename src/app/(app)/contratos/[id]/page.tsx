import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";

export default async function PainelContrato({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") redirect("/painel");
  const { id } = await params;
  const empresa = await prisma.empresaCliente.findUnique({
    where: { id },
    include: { solicitacoes: true, unidades: true },
  });
  if (!empresa) redirect("/contratos");
  const volume = empresa.solicitacoes.reduce((soma, item) => soma + Number(item.volumeM3), 0);
  const pendentes = empresa.solicitacoes.filter((item) => item.status === "ENVIADA").length;
  return (
    <>
      <header className="pagina-cabeca"><div><p className="sobretitulo">Contrato</p><h1>{empresa.nome}</h1></div></header>
      <section className="grade-stats">
        <article className="cartao stat"><span>Solicitações</span><b>{empresa.solicitacoes.length}</b></article>
        <article className="cartao stat"><span>Em análise</span><b>{pendentes}</b></article>
        <article className="cartao stat"><span>Volume</span><b>{volume.toFixed(1).replace(".", ",")} m³</b></article>
        <article className="cartao stat"><span>Unidades</span><b>{empresa.unidades.length}</b></article>
      </section>
      <ul>{empresa.unidades.map((unidade) => <li key={unidade.id}>{unidade.nome}/{unidade.uf}</li>)}</ul>
    </>
  );
}
