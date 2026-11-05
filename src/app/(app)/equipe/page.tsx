import { FormAlternarUsuario, FormUsuario } from "@/components/formularios";
import { rotuloPapel } from "@/lib/domain";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Equipe" };

export default async function EquipePage() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return <p className="alerta">Só um administrador gerencia a equipe.</p>;
  const equipe = await prisma.usuario.findMany({ orderBy: { nome: "asc" } });

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Acesso</p>
          <h1>Equipe</h1>
          <p className="muted">Administrador, comercial, operação e financeiro.</p>
        </div>
      </header>
      <section className="ficha">
        <article className="cartao bloco">
          <h2>Novo usuário</h2>
          <FormUsuario />
        </article>
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {equipe.map((pessoa) => (
                <tr key={pessoa.id}>
                  <td>
                    <strong>{pessoa.nome}</strong>
                    <div className="muted">{pessoa.email}</div>
                    <div className="muted">desde {formatarDataHora(pessoa.criadoEm)}</div>
                  </td>
                  <td>{rotuloPapel(pessoa.papel)}</td>
                  <td>{pessoa.ativo ? "Ativo" : "Inativo"}</td>
                  <td>{pessoa.id === usuario.id ? "Você" : <FormAlternarUsuario usuarioId={pessoa.id} ativo={pessoa.ativo} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
