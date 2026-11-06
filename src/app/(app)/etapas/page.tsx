import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { rotuloEtapa } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";
import { alternarEtapaAction, moverOrdemEtapaAction, salvarEtapaAction } from "@/server/acoes-cadastro";
import { atualizarRegraTarefaAction } from "@/server/actions-operacao";
import { carregarEtapas } from "@/server/etapas";
import { garantirTarefasPadrao } from "@/server/tarefas";

export const metadata = { title: "Etapas" };

export default async function EtapasPage() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return <p className="alerta">Só um administrador configura as oportunidades.</p>;
  await garantirTarefasPadrao();
  const [etapas, regras] = await Promise.all([
    carregarEtapas(),
    prisma.regraTarefa.findMany({ include: { tipo: true } }),
  ]);
  const ordem = new Map(etapas.map((etapa, indice) => [etapa.slug, indice]));
  regras.sort((a, b) => (ordem.get(a.etapaSlug) ?? 999) - (ordem.get(b.etapaSlug) ?? 999));

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
      <section className="cartao bloco regras-auto">
        <h2>Tarefas criadas ao mudar de etapa</h2>
        <p className="muted">Quando o processo entra na etapa, esta tarefa abre depois do prazo abaixo. O prazo está em horas.</p>
        <div className="regra-cabeca" aria-hidden="true">
          <span>Etapa</span>
          <span>Tipo</span>
          <span>Título da tarefa</span>
          <span>Prazo</span>
          <span>Ativa</span>
          <span></span>
        </div>
        {regras.map((regra) => (
          <form key={regra.id} action={atualizarRegraTarefaAction} className="regra-linha">
            <input type="hidden" name="id" value={regra.id} />
            <p className="nome-etapa">{rotuloEtapa(regra.etapaSlug, etapas)}</p>
            <p>{regra.tipo.rotulo}</p>
            <label className="campo">
              <span>Título da tarefa</span>
              <input name="titulo" defaultValue={regra.titulo} aria-label={`Título da tarefa em ${rotuloEtapa(regra.etapaSlug, etapas)}`} />
            </label>
            <label className="campo">
              <span>Prazo</span>
              <span className="campo-unidade">
                <input name="horasDepois" type="number" min={0} defaultValue={regra.horasDepois} aria-label={`Horas depois, ${rotuloEtapa(regra.etapaSlug, etapas)}`} />
                <span>horas</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" name="ativa" defaultChecked={regra.ativa} /> Ativa
            </label>
            <button className="btn secundario" type="submit">Salvar</button>
          </form>
        ))}
      </section>
    </>
  );
}
