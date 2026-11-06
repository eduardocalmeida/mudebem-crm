import Link from "next/link";
import { SeloEtapa } from "@/components/selos";
import { rotuloEtapa } from "@/lib/domain";
import { adicionarDias, formatarBRL, formatarData, formatarDataHora, localidade, saudacao, textoQuando } from "@/lib/format";
import { carregarPainel } from "@/server/painel";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Início" };

export default async function PainelPage() {
  const usuario = await exigirUsuario();
  const painel = await carregarPainel();
  const maiorEtapa = Math.max(1, ...painel.porEtapa.map((etapa) => etapa.quantidade));
  const maiorCanal = Math.max(1, ...painel.canais.map((canal) => canal.quantidade));
  const maiorPessoa = Math.max(1, ...painel.responsaveis.map((pessoa) => pessoa.quantidade));
  const maiorEtiqueta = Math.max(1, ...painel.etiquetas.map((etiqueta) => etiqueta.quantidade));
  const vencido = painel.vencidos.reduce((total, item) => total + item.valor, 0);
  const maxSerie = Math.max(1, ...painel.serie.flatMap((ponto) => [ponto.leads, ponto.ganhos]));

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Início</p>
          <h1>{saudacao(usuario.nome)}</h1>
          <p className="muted">Oportunidades, agenda e origens da Mude Bem. Datas em America/Sao_Paulo.</p>
        </div>
        <Link className="btn primario" href="/processos/novo">
          Nova oportunidade
        </Link>
      </header>
      {painel.exemplos ? (
        <p className="faixa-exemplo">O painel inclui processos de exemplo criados pelo seed. Eles estão marcados no quadro.</p>
      ) : null}
      <section className="kpi-grade">
        <Link className="cartao stat" href="/processos">
          <span>Leads novos</span>
          <b>{painel.novos}</b>
          <em>últimos 7 dias</em>
        </Link>
        <Link className="cartao stat" href="/processos">
          <span>Em andamento</span>
          <b>{painel.abertos}</b>
          <em>{painel.total} no total</em>
        </Link>
        <article className="cartao stat">
          <span>Ganhos e perdidos</span>
          <b>{painel.ganhos}<small> / {painel.perdidos}</small></b>
          <em>ganhos / perdidos</em>
        </article>
        <article className="cartao stat">
          <span>Valor na pipeline</span>
          <b>{formatarBRL(painel.valorPipeline)}</b>
          <em>aprovado ou, na falta, cotado</em>
        </article>
        <Link className="cartao stat" href="/tarefas?visao=dia">
          <span>Tarefas do dia</span>
          <b>{painel.tarefasHoje}</b>
          <em>{painel.tarefasAtrasadas === 1 ? "1 atrasada" : `${painel.tarefasAtrasadas} atrasadas`}</em>
        </Link>
      </section>

      <section className="dash-grade">
        <article className="painel-card">
          <h2>Oportunidades por etapa</h2>
          <div className="funil">
            {painel.porEtapa.map((etapa) => (
              <Link key={etapa.slug} className="funil-linha" href={`/processos?visao=kanban&etapa=${etapa.slug}`}>
                <span>{etapa.rotulo}</span>
                <span className="funil-trilho" aria-hidden>
                  <i style={{ width: `${Math.max(etapa.quantidade === 0 ? 0 : 8, (etapa.quantidade / maiorEtapa) * 100)}%`, background: etapa.cor }} />
                </span>
                <strong>{etapa.quantidade}</strong>
                <em>{formatarBRL(etapa.valor)}</em>
              </Link>
            ))}
          </div>
        </article>
        <article className="painel-card">
          <h2>Leads e ganhos</h2>
          <p className="muted">Oito semanas. Leads pela data de criação; ganhos pela mudança de etapa.</p>
          <Serie pontos={painel.serie} maximo={maxSerie} />
          <p className="legenda"><i className="lead" /> Leads <i className="ganho" /> Ganhos</p>
        </article>
      </section>

      <section className="dash-grade tres">
        <article className="painel-card">
          <h2>Origens</h2>
          {painel.canais.length === 0 ? <p className="muted">Nenhum lead ainda.</p> : null}
          <Barras itens={painel.canais.map((canal) => ({ chave: canal.id, rotulo: canal.rotulo, valor: canal.quantidade, texto: String(canal.quantidade) }))} maximo={maiorCanal} />
        </article>
        <article className="painel-card">
          <h2>Responsáveis</h2>
          {painel.responsaveis.length === 0 ? <p className="muted">Nenhum processo com responsável.</p> : null}
          <Barras itens={painel.responsaveis.map((pessoa) => ({ chave: pessoa.nome, rotulo: pessoa.nome, valor: pessoa.quantidade, texto: formatarBRL(pessoa.valor) }))} maximo={maiorPessoa} />
        </article>
        <article className="painel-card">
          <h2>Etiquetas</h2>
          {painel.etiquetas.length === 0 ? <p className="muted">Nenhuma etiqueta nos processos.</p> : null}
          <Barras itens={painel.etiquetas.map((etiqueta) => ({ chave: etiqueta.nome, rotulo: etiqueta.nome, valor: etiqueta.quantidade, texto: String(etiqueta.quantidade) }))} maximo={maiorEtiqueta} />
        </article>
      </section>

      <section className="dash-grade">
        <article className="painel-card">
          <h2>Agenda</h2>
          <p className="muted">Tarefas abertas de hoje até {formatarData(adicionarDias(painel.hoje, 7))}.</p>
          <div className="lista-simples">
            {painel.agenda.length === 0 ? <p className="muted">Nada na agenda desta semana.</p> : null}
            {painel.agenda.map((tarefa) => (
              <Link key={tarefa.id} href={`/processos/${tarefa.processoId}`} className="item-lista">
                <span>
                  <strong>{tarefa.titulo}</strong>
                  <br />
                  <span className="muted">{tarefa.tipo} · {tarefa.codigo}</span>
                </span>
                <span className="muted">{formatarDataHora(new Date(tarefa.vencimento))}</span>
              </Link>
            ))}
          </div>
          <p><Link href="/tarefas?visao=semana">Abrir calendário</Link></p>
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
            <h2>Contas vencidas <span className="muted">{formatarBRL(vencido)}</span></h2>
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

function Barras({ itens, maximo }: { itens: { chave: string; rotulo: string; valor: number; texto: string }[]; maximo: number }) {
  return (
    <div className="barras">
      {itens.map((item) => (
        <div key={item.chave} className="barra-metrica">
          <span>{item.rotulo}</span>
          <span className="funil-trilho" aria-hidden>
            <i style={{ width: `${(item.valor / maximo) * 100}%` }} />
          </span>
          <strong>{item.texto}</strong>
        </div>
      ))}
    </div>
  );
}

function Serie({ pontos, maximo }: { pontos: { rotulo: string; leads: number; ganhos: number }[]; maximo: number }) {
  const largura = 640;
  const altura = 210;
  const margem = 28;
  const x = (indice: number) => margem + (indice * (largura - margem * 2)) / Math.max(1, pontos.length - 1);
  const y = (valor: number) => altura - margem - (valor / maximo) * (altura - margem * 2);
  const linha = (chave: "leads" | "ganhos") => pontos.map((ponto, indice) => `${x(indice)},${y(ponto[chave])}`).join(" ");
  return (
    <svg className="serie" viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Leads criados e ganhos por semana">
      {[0, 0.5, 1].map((marca) => (
        <line key={marca} x1={margem} x2={largura - margem} y1={y(maximo * marca)} y2={y(maximo * marca)} stroke="#E2D9CF" />
      ))}
      <polyline points={linha("leads")} fill="none" stroke="#101828" strokeWidth="3" strokeLinejoin="round" />
      <polyline points={linha("ganhos")} fill="none" stroke="#B89870" strokeWidth="3" strokeLinejoin="round" />
      {pontos.map((ponto, indice) => (
        <g key={ponto.rotulo}>
          <circle cx={x(indice)} cy={y(ponto.leads)} r="3.5" fill="#101828" />
          <circle cx={x(indice)} cy={y(ponto.ganhos)} r="3.5" fill="#B89870" />
          <text x={x(indice)} y={altura - 8} textAnchor="middle" fontSize="12" fill="#6B6F76">{ponto.rotulo}</text>
        </g>
      ))}
    </svg>
  );
}
