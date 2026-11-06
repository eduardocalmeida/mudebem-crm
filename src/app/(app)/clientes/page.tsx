import Link from "next/link";
import { SeloExemplo } from "@/components/selos";
import { formatarCnpj, localidade } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Listas" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirUsuario();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const aba = sp.aba === "contatos" ? "contatos" : "empresas";
  const filtroEmpresa = q
    ? {
        OR: [
          { nome: { contains: q, mode: "insensitive" as const } },
          { cidade: { contains: q, mode: "insensitive" as const } },
          { cnpj: { contains: q.replace(/\D/g, "") || q } },
        ],
      }
    : undefined;
  const filtroContato = q
    ? {
        OR: [
          { nome: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { telefone: { contains: q } },
          { cliente: { nome: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : undefined;
  const [clientes, contatos] = await Promise.all([
    prisma.cliente.findMany({
      where: filtroEmpresa,
      include: { _count: { select: { contatos: true, processos: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.contato.findMany({
      where: filtroContato,
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { nome: "asc" },
    }),
  ]);
  const busca = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Listas</p>
          <h1>{aba === "contatos" ? "Contatos" : "Empresas"}</h1>
        </div>
        {aba === "empresas" ? (
          <Link className="btn primario" href="/clientes/novo">
            Nova empresa
          </Link>
        ) : null}
      </header>
      <nav className="abas abas-listas" aria-label="Listas">
        <Link className={aba === "empresas" ? "ativa" : undefined} href={`/clientes?aba=empresas${busca}`}>Empresas</Link>
        <Link className={aba === "contatos" ? "ativa" : undefined} href={`/clientes?aba=contatos${busca}`}>Contatos</Link>
      </nav>
      <form className="filtros" method="get">
        <input type="hidden" name="aba" value={aba} />
        <label className="campo">
          <span>Busca</span>
          <input name="q" defaultValue={q} placeholder={aba === "contatos" ? "Nome, e-mail, telefone ou empresa" : "Nome, cidade ou CNPJ"} />
        </label>
        <button className="btn secundario" type="submit">
          Buscar
        </button>
      </form>
      {aba === "contatos" ? (
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Contato</th>
                <th>Empresa</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Cargo</th>
              </tr>
            </thead>
            <tbody>
              {contatos.length === 0 ? (
                <tr>
                  <td colSpan={5}>Nenhum contato encontrado.</td>
                </tr>
              ) : null}
              {contatos.map((contato) => (
                <tr key={contato.id}>
                  <td><strong>{contato.nome}</strong></td>
                  <td><Link href={`/clientes/${contato.cliente.id}`}>{contato.cliente.nome}</Link></td>
                  <td>{contato.email || "—"}</td>
                  <td>{contato.telefone || "—"}</td>
                  <td>{contato.cargo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {aba === "empresas" ? <div className="tabela-wrap">
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
      </div> : null}
    </>
  );
}
