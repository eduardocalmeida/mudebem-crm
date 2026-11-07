import Link from "next/link";
import { listarMdfes } from "@/server/mdfe/mdfe";
import { exigirUsuario } from "@/server/session";

const ROTULO: Record<string, string> = {
  RASCUNHO: "Rascunho",
  AUTORIZADO: "Autorizado",
  ENCERRADO: "Encerrado",
  CANCELADO: "Cancelado",
  REJEITADO: "Rejeitado",
  PROCESSANDO: "Processando",
};

export const metadata = { title: "MDF-e" };

export default async function MdfePage() {
  await exigirUsuario();
  const lista = await listarMdfes();
  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Viagem</p>
          <h1>MDF-e</h1>
          <p className="muted">Manifesto rodoviário que agrupa os CT-e de uma viagem. Abra um a partir do processo.</p>
        </div>
      </header>
      {lista.length === 0 ? <p className="muted">Nenhum manifesto ainda.</p> : null}
      <ul className="lista-tarefas">
        {lista.map((mdfe) => (
          <li key={mdfe.id}>
            <div>
              <strong>
                <Link href={`/mdfe/${mdfe.id}`}>{mdfe.numero || "Rascunho"}</Link>
              </strong>
              <div className="muted">
                {ROTULO[mdfe.status] || mdfe.status} · {mdfe._count.documentos} CT-e · {mdfe.ufInicio || "—"} → {mdfe.ufFim || "—"} ·{" "}
                {mdfe.processo.codigo}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
