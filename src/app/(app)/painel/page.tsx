import Link from "next/link";
import { SeloEtapa } from "@/components/selos";
import { rotuloEtapa } from "@/lib/domain";
import { adicionarDias, formatarBRL, formatarData, localidade, saudacao, textoQuando } from "@/lib/format";
import { carregarPainel } from "@/server/painel";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Painel" };

export default async function PainelPage() {
  const usuario = await exigirUsuario();
  const painel = await carregarPainel();
  const maior = Math.max(1, ...painel.porEtapa.map((etapa) => etapa.quantidade));
  const vencido = painel.vencidos.reduce((total, item) => total + item.valor, 0);

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Visão do dia</p>
          <h1>{saudacao(usuario.nome)}</h1>
          <p className="muted">Pipeline comercial, operação e recebíveis da Mude Bem. Datas em America/Sao_Paulo.</p>
        </div>
        <Link className="btn primario" href="/processos/novo">
          Novo processo
        </Link>
      </header>
      {painel.exemplos ? (
        <p className="faixa-exemplo">O painel inclui processos de exemplo criados pelo seed. Eles estão marcados no quadro.</p>
      ) : null}
      <section className="grade-stats">
        <article className="cartao stat">
          <span>Em aberto</span>
          <b>{painel.abertos}</b>
          <em>{painel.total} no total</em>
        </article>
        <article className="cartao stat">
          <span>Valor na pipeline</span>
          <b>{formatarBRL(painel.valorPipeline)}</b>
          <em>aprovado ou, na falta, cotado</em>
        </article>
        <article className="cartao stat">
          <span>Coletas em 7 dias</span>
          <b>{painel.coletas.length}</b>
          <em>até {formatarData(adicionarDias(painel.hoje, 7))}</em>
        </article>
        <article className="cartao stat">
          <span>Recebíveis vencidos</span>
          <b>{formatarBRL(vencido)}</b>
          <em>{painel.vencidos.length === 1 ? "1 título" : `${painel.vencidos.length} títulos`}</em>
        </article>
      </section>
      <section className="layout-painel">
        <article className="painel-card">
          <h2>Por etapa</h2>
          <div>
            {painel.porEtapa.map((etapa) => (
              <div className="etapa-linha" key={etapa.slug}>
                <Link href={`/processos?visao=kanban&etapa=${etapa.slug}`}>{etapa.rotulo}</Link>
                <strong>{etapa.quantidade}</strong>
                <span>{formatarBRL(etapa.valor)}</span>
                <div className="trilho" aria-hidden>
                  <i style={{ width: `${(etapa.quantidade / maior) * 100}%`, background: etapa.cor }} />
                </div>
              </div>
            ))}
          </div>
        </article>
        <div>
          <article className="painel-card">
            <h2>Coletas próximas</h2>
            <div className="lista-simples">
              {painel.coletas.length === 0 ? <p className="muted">Nenhuma coleta nos próximos 7 dias.</p> : null}
              {painel.coletas.map((coleta) => (
                <Link key={coleta.id} href={`/processos/${coleta.id}`} className="item-lista">
                  <span>
                    <strong>{coleta.cliente}</strong>
                    <br />
                    <span className="muted">
                      {localidade(coleta.origem, null)} → {localidade(coleta.destino, null)} · {rotuloEtapa(coleta.etapa)}
                    </span>
                  </span>
                  <span>
                    {formatarData(coleta.dataColeta)}
                    <br />
                    <span className="muted">{textoQuando(coleta.dataColeta, painel.hoje)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </article>
          <article className="painel-card" style={{ marginTop: 14 }}>
            <h2>Contas vencidas</h2>
            <div className="lista-simples">
              {painel.vencidos.length === 0 ? <p className="muted">Nenhum recebível vencido.</p> : null}
              {painel.vencidos.map((item) => (
                <Link key={item.id} href={`/processos/${item.id}`} className="item-lista">
                  <span>
                    <strong>{item.cliente}</strong>
                    <br />
                    <span className="muted">NF {item.numeroNf ?? "—"} · {item.codigo}</span>
                  </span>
                  <span>
                    {formatarBRL(item.valor)}
                    <br />
                    <SeloEtapa etapa={item.etapa} />
                    <br />
                    <span className="muted">venceu {textoQuando(item.dataVencimento, painel.hoje)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
