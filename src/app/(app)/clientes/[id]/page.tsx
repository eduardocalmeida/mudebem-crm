import Link from "next/link";
import { notFound } from "next/navigation";
import { FormCliente, FormContato } from "@/components/formularios";
import { SeloEtapa, SeloExemplo } from "@/components/selos";
import { podeGerirClientes } from "@/lib/domain";
import { AppError } from "@/lib/errors";
import { formatarCnpj } from "@/lib/format";
import { obterCliente } from "@/server/clientes";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Cliente" };

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const cliente = await obterCliente(id).catch((erro: unknown) => {
    if (erro instanceof AppError && erro.status === 404) return null;
    throw erro;
  });
  if (!cliente) notFound();
  const podeEditar = podeGerirClientes(usuario.papel);

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Cliente</p>
          <h1>{cliente.nome}</h1>
          <p className="muted">
            {formatarCnpj(cliente.cnpj)} · {cliente.cidade || "cidade não informada"}
            {cliente.uf ? `/${cliente.uf}` : ""} {cliente.exemplo ? <SeloExemplo /> : null}
          </p>
        </div>
        <Link className="btn secundario" href="/clientes">
          Todos os clientes
        </Link>
      </header>
      {cliente.exemplo ? <p className="faixa-exemplo">Cadastro de exemplo gerado pelo seed.</p> : null}
      <section className="ficha">
        <article className="cartao bloco">
          <h2>Empresa</h2>
          {podeEditar ? (
            <FormCliente
              clienteId={cliente.id}
              valores={{
                nome: cliente.nome,
                cnpj: formatarCnpj(cliente.cnpj) === "—" ? "" : formatarCnpj(cliente.cnpj),
                email: cliente.email ?? "",
                telefone: cliente.telefone ?? "",
                endereco: cliente.endereco ?? "",
                cidade: cliente.cidade ?? "",
                uf: cliente.uf ?? "",
                observacoes: cliente.observacoes ?? "",
              }}
            />
          ) : (
            <p>{cliente.observacoes || "Sem observações."}</p>
          )}
        </article>
        <div>
          <article className="cartao bloco">
            <h2>Contatos</h2>
            <ul>
              {cliente.contatos?.map((contato) => (
                <li key={contato.id}>
                  <strong>{contato.nome}</strong> {contato.principal ? "· principal" : ""}
                  <div className="muted">
                    {contato.cargo || "sem cargo"} · {contato.email || "sem e-mail"} · {contato.telefone || "sem telefone"}
                  </div>
                </li>
              ))}
            </ul>
            {podeEditar ? <FormContato clienteId={cliente.id} /> : null}
          </article>
          <article className="cartao bloco">
            <h2>Processos</h2>
            <div className="lista-simples">
              {cliente.processos.length === 0 ? <p className="muted">Nenhum processo ligado a este cliente.</p> : null}
              {cliente.processos.map((processo) => (
                <Link key={processo.id} href={`/processos/${processo.id}`} className="item-lista">
                  <span>
                    {processo.codigo}
                    <br />
                    <strong>{processo.titulo}</strong>
                  </span>
                  <SeloEtapa etapa={processo.etapa} />
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
