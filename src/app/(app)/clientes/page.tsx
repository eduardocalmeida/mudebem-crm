import Link from "next/link";
import { SeloExemplo } from "@/components/selos";
import { formatarCnpj, localidade } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirUsuario();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const clientes = await prisma.cliente.findMany({
    where: q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" } },
            { cidade: { contains: q, mode: "insensitive" } },
            { cnpj: { contains: q.replace(/\D/g, "") || q } },
          ],
        }
      : undefined,
    include: { _count: { select: { contatos: true, processos: true } } },
    orderBy: { nome: "asc" },
  });

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Cadastros</p>
          <h1>Clientes</h1>
        </div>
        <Link className="btn primario" href="/clientes/novo">
          Novo cliente
        </Link>
      </header>
      <form className="filtros" method="get">
        <label className="campo">
          <span>Busca</span>
          <input name="q" defaultValue={q} placeholder="Nome, cidade ou CNPJ" />
        </label>
        <button className="btn secundario" type="submit">
          Buscar
        </button>
      </form>
      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>CNPJ</th>
              <th>Cidade</th>
              <th>Contatos</th>
              <th>Processos</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={5}>Nenhum cliente encontrado.</td>
              </tr>
            ) : null}
            {clientes.map((cliente) => (
              <tr key={cliente.id}>
                <td>
                  <Link href={`/clientes/${cliente.id}`}>
                    <strong>{cliente.nome}</strong>
                  </Link>{" "}
                  {cliente.exemplo ? <SeloExemplo /> : null}
                </td>
                <td>{formatarCnpj(cliente.cnpj)}</td>
                <td>{localidade(cliente.cidade, cliente.uf)}</td>
                <td>{cliente._count.contatos}</td>
                <td>{cliente._count.processos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
