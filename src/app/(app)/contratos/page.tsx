import Link from "next/link";
import { redirect } from "next/navigation";
import { importarFaixasAction } from "@/server/actions-portal";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Contratos" };

export default async function ContratosPage() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") redirect("/painel");
  const empresas = await prisma.empresaCliente.findMany({
    include: { contratos: { include: { _count: { select: { faixas: true } } } }, _count: { select: { solicitacoes: true, unidades: true } } },
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <header className="pagina-cabeca"><div><p className="sobretitulo">Corporativo</p><h1>Contratos</h1></div></header>
      {empresas.map((empresa) => (
        <article key={empresa.id} className="cartao bloco">
          <h2><Link href={`/contratos/${empresa.id}`}>{empresa.nome}</Link></h2>
          <p className="muted">/{empresa.slug} · {empresa._count.unidades} unidades · {empresa._count.solicitacoes} pedidos</p>
          {empresa.contratos.map((contrato) => (
            <div key={contrato.id}>
              <p>{contrato.nome} · {contrato._count.faixas} faixas · seguro {Number(contrato.seguroPercentual) * 100}%</p>
              <form action={importarFaixasAction}>
                <input type="hidden" name="contratoId" value={contrato.id} />
                <textarea name="csv" placeholder="volumeMin;volumeMax;kmMin;kmMax;precoPorKm" />
                <label className="check"><input type="checkbox" name="substituir" /> Substituir faixas</label>
                <button className="btn secundario" type="submit">Importar CSV</button>
              </form>
              <p><Link href={`/processos?etiqueta=${encodeURIComponent(`Contrato ${empresa.nome}`)}`}>Ver no quadro</Link></p>
            </div>
          ))}
        </article>
      ))}
    </>
  );
}
