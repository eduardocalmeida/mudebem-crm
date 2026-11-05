import { atualizarCatalogoAction } from "@/server/actions-operacao";
import { listarCatalogo } from "@/server/inventario";
import { exigirUsuario } from "@/server/session";
import { redirect } from "next/navigation";

export default async function CatalogoPage() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") redirect("/painel");
  const itens = await listarCatalogo();
  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Mudança</p>
          <h1>Catálogo de volumes</h1>
          <p className="muted">Volumes padrão em m³. A alteração vale para os próximos itens lançados.</p>
        </div>
      </header>
      <table className="tabela">
        <thead>
          <tr>
            <th>Item</th>
            <th>Categoria</th>
            <th>m³</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>{item.nome}</td>
              <td>{item.categoria}</td>
              <td>
                <form action={atualizarCatalogoAction} className="linha">
                  <input type="hidden" name="id" value={item.id} />
                  <input name="volumeM3" defaultValue={item.volumeM3.toNumber().toFixed(3).replace(".", ",")} />
                  <button className="btn secundario" type="submit">Salvar</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
