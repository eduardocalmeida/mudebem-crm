import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { exigirUsuario } from "@/server/session";
import { alternarEtapaAction, moverOrdemEtapaAction, salvarEtapaAction } from "@/server/acoes-cadastro";
import { carregarEtapas } from "@/server/etapas";

export const metadata = { title: "Etapas" };

export default async function EtapasPage() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return <p className="alerta">Só um administrador configura as oportunidades.</p>;
  const etapas = await carregarEtapas();

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Oportunidades</p>
          <h1>Etapas</h1>
          <p className="muted">A ordem da Kommo, com Contas a receber e Recebido no fim. Ganho e Perdido fecham o processo.</p>
        </div>
        <Link className="btn secundario" href="/processos">
          Ver quadro
        </Link>
      </header>
      <section className="ficha">
        <article className="cartao bloco">
          <h2>Nova etapa</h2>
          <FormAcao acao={salvarEtapaAction} className="grade-form">
            <label className="campo">
              <span>Nome</span>
              <input name="rotulo" required />
            </label>
            <label className="campo">
              <span>Grupo</span>
              <select name="grupo" defaultValue="comercial">
                <option value="comercial">Comercial</option>
                <option value="operacao">Operação</option>
                <option value="financeiro">Financeiro</option>
                <option value="terminal">Terminal</option>
              </select>
            </label>
            <label className="campo">
              <span>Cor</span>
              <input name="cor" type="color" defaultValue="#1e4d3a" />
            </label>
            <div>
              <button className="btn primario" type="submit">
                Adicionar
              </button>
            </div>
          </FormAcao>
        </article>
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Etapa</th>
                <th>Grupo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {etapas.map((etapa, indice) => (
                <tr key={etapa.slug}>
                  <td>{indice + 1}</td>
                  <td>
                    <strong style={{ color: etapa.cor }}>{etapa.rotulo}</strong>
                    <div className="muted">{etapa.ativa ? etapa.slug : "desativada"}</div>
                  </td>
                  <td>{etapa.grupo}</td>
                  <td>
                    <FormAcao acao={moverOrdemEtapaAction}>
                      <input type="hidden" name="id" value={etapa.slug} />
                      <input type="hidden" name="direcao" value="cima" />
                      <button className="btn secundario" type="submit">
                        Subir
                      </button>
                    </FormAcao>
                    <FormAcao acao={moverOrdemEtapaAction}>
                      <input type="hidden" name="id" value={etapa.slug} />
                      <input type="hidden" name="direcao" value="baixo" />
                      <button className="btn secundario" type="submit">
                        Descer
                      </button>
                    </FormAcao>
                    <FormAcao acao={alternarEtapaAction}>
                      <input type="hidden" name="id" value={etapa.slug} />
                      <button className="btn secundario" type="submit">
                        {etapa.ativa ? "Desativar" : "Reativar"}
                      </button>
                    </FormAcao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
