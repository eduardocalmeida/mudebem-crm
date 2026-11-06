import Link from "next/link";
import { atualizarRegraTarefaAction, criarTarefaAction } from "@/server/actions-operacao";
import { formatarData, formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { garantirTarefasPadrao, listarTarefas, tarefaAtrasada } from "@/server/tarefas";
import { exigirUsuario } from "@/server/session";

function diaSp(data: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(data);
}

function partesSp(data: Date) {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const ler = (tipo: string) => Number(partes.find((parte) => parte.type === tipo)?.value || "0");
  return { hora: ler("hour"), minuto: ler("minute") };
}

function deslocar(iso: string, dias: number) {
  const data = new Date(`${iso}T12:00:00-03:00`);
  data.setUTCDate(data.getUTCDate() + dias);
  return diaSp(data);
}

function inicioSemana(iso: string) {
  return deslocar(iso, -((new Date(`${iso}T12:00:00-03:00`).getUTCDay() + 6) % 7));
}

function rotuloDia(iso: string) {
  const data = new Date(`${iso}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "short" }).format(data).replace(".", "");
}

function semanaRotulo(inicio: string) {
  const fim = deslocar(inicio, 6);
  return `${rotuloDia(inicio)} – ${rotuloDia(fim)} ${fim.slice(0, 4)}`;
}

function rota(processo: { origemCidade: string | null; origemUf: string | null; destinoCidade: string | null; destinoUf: string | null; titulo: string; codigo: string }) {
  if (processo.origemCidade || processo.destinoCidade) {
    return `${processo.origemCidade || "—"}${processo.origemUf ? `/${processo.origemUf}` : ""} → ${processo.destinoCidade || "—"}${processo.destinoUf ? `/${processo.destinoUf}` : ""}`;
  }
  return processo.titulo || processo.codigo;
}

function classeTipo(slug: string, atrasada: boolean) {
  if (atrasada) return "tipo-atraso";
  if (slug === "WHATSAPP") return "tipo-whats";
  if (slug === "FATURAMENTO") return "tipo-fatura";
  if (slug === "RECEBIMENTO") return "tipo-recebe";
  if (slug === "ACOMPANHAR") return "tipo-acompanha";
  return "tipo-navy";
}

const HORAS = Array.from({ length: 15 }, (_, indice) => indice + 7);
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type TarefaCard = Awaited<ReturnType<typeof listarTarefas>>[number];

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string; quem?: string; data?: string; nova?: string }>;
}) {
  const usuario = await exigirUsuario();
  await garantirTarefasPadrao();
  const regras = usuario.papel === "ADMIN"
    ? await prisma.regraTarefa.findMany({ include: { tipo: true }, orderBy: { etapaSlug: "asc" } })
    : [];
  const consulta = await searchParams;
  const visao = consulta.visao === "lista" || consulta.visao === "semana" || consulta.visao === "dia" || consulta.visao === "mes" ? consulta.visao : "quadro";
  const quem = consulta.quem === "equipe" ? "equipe" : "eu";
  const ancora = /^\d{4}-\d{2}-\d{2}$/.test(consulta.data || "") ? consulta.data! : diaSp(new Date());
  const inicioSem = inicioSemana(ancora);
  const hojeReal = diaSp(new Date());
  const base = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ visao, quem, data: ancora, ...extra });
    if (consulta.nova === "1" && !("nova" in extra)) params.set("nova", "1");
    return `/tarefas?${params.toString()}`;
  };
  const salto = visao === "mes" ? 30 : visao === "semana" ? 7 : 1;
  const inicio = visao === "mes" ? `${ancora.slice(0, 8)}01` : visao === "semana" ? inicioSem : ancora;
  const fim = visao === "mes" ? deslocar(`${ancora.slice(0, 8)}01`, 32).slice(0, 8) + "01" : visao === "semana" ? deslocar(inicioSem, 7) : deslocar(ancora, 1);
  const tarefas = await listarTarefas({
    responsavelId: quem === "eu" ? usuario.id : undefined,
    de: visao === "lista" || visao === "quadro" ? undefined : new Date(`${inicio}T00:00:00-03:00`),
    ate: visao === "lista" || visao === "quadro" ? undefined : new Date(`${fim}T00:00:00-03:00`),
  });
  const abertas = tarefas.filter((tarefa) => !tarefa.concluidaEm);
  const processos = consulta.nova === "1"
    ? await prisma.processo.findMany({ orderBy: { atualizadoEm: "desc" }, take: 80, select: { id: true, codigo: true, titulo: true } })
    : [];
  const tipos = consulta.nova === "1" ? await prisma.tipoTarefa.findMany({ orderBy: { rotulo: "asc" } }) : [];

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Agenda</p>
          <h1>Calendário</h1>
        </div>
        <Link className="btn primario" href={base({ nova: consulta.nova === "1" ? "" : "1" })}>Nova tarefa</Link>
      </header>
      <div className="agenda-topo">
        <div className="visoes">
          <Link className={visao === "quadro" ? "ativo" : undefined} href={base({ visao: "quadro", nova: "" })}>Quadro</Link>
          <Link className={visao === "lista" ? "ativo" : undefined} href={base({ visao: "lista", nova: "" })}>Lista</Link>
          <Link className={visao === "semana" || visao === "dia" ? "ativo" : undefined} href={base({ visao: "semana", nova: "" })}>Semana</Link>
        </div>
        <div className="linha">
          <Link className="btn secundario" href={base({ data: deslocar(ancora, -salto), nova: "" })} aria-label="Período anterior">←</Link>
          <strong>{visao === "semana" || visao === "dia" ? semanaRotulo(inicioSem) : visao === "mes" ? ancora.slice(0, 7) : ancora === hojeReal ? "Hoje" : formatarData(ancora)}</strong>
          <Link className="btn secundario" href={base({ data: deslocar(ancora, salto), nova: "" })} aria-label="Próximo período">→</Link>
          {ancora !== hojeReal ? <Link className="btn secundario" href={base({ data: hojeReal, nova: "" })}>Hoje</Link> : null}
        </div>
        <div className="visoes">
          <Link className={quem === "eu" ? "ativo" : undefined} href={base({ quem: "eu" })}>Minhas</Link>
          <Link className={quem === "equipe" ? "ativo" : undefined} href={base({ quem: "equipe" })}>Equipe</Link>
        </div>
      </div>
      {consulta.nova === "1" ? (
        <form action={criarTarefaAction} className="cartao bloco grade-form">
          <input type="hidden" name="voltar" value={base({ nova: "" })} />
          <label className="campo largo">
            <span>Oportunidade</span>
            <select name="processoId" required defaultValue="">
              <option value="" disabled>Escolha o lead</option>
              {processos.map((processo) => (
                <option key={processo.id} value={processo.id}>{processo.codigo} · {processo.titulo}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Tipo</span>
            <select name="tipoId" required defaultValue={tipos[0]?.id}>
              {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.rotulo}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>Vencimento</span>
            <input name="vencimento" required placeholder="dd/mm/aaaa hh:mm" defaultValue={`${ancora.split("-").reverse().join("/")} 09:00`} />
          </label>
          <label className="campo largo">
            <span>Comentário</span>
            <input name="titulo" required placeholder="O que precisa ser feito" />
          </label>
          <button className="btn primario" type="submit">Criar tarefa</button>
        </form>
      ) : null}

      {visao === "quadro" ? <Quadro tarefas={abertas} ancora={ancora} /> : null}
      {visao === "lista" ? <Lista tarefas={tarefas} ancora={ancora} /> : null}
      {visao === "semana" || visao === "dia" ? <Semana tarefas={tarefas} inicio={inicioSem} somente={visao === "dia" ? ancora : null} /> : null}
      {visao === "mes" ? <Mes tarefas={tarefas} ancora={ancora} /> : null}

      {regras.length > 0 ? (
        <section className="cartao bloco">
          <h2>Tarefas criadas ao mudar de etapa</h2>
          {regras.map((regra) => (
            <form key={regra.id} action={atualizarRegraTarefaAction} className="linha">
              <input type="hidden" name="id" value={regra.id} />
              <strong>{regra.etapaSlug}</strong>
              <span className="muted">{regra.tipo.rotulo}</span>
              <input name="titulo" defaultValue={regra.titulo} />
              <input name="horasDepois" type="number" min={0} defaultValue={regra.horasDepois} />
              <label className="check">
                <input type="checkbox" name="ativa" defaultChecked={regra.ativa} /> Ativa
              </label>
              <button className="btn secundario" type="submit">Salvar</button>
            </form>
          ))}
        </section>
      ) : null}
    </>
  );
}

function Cartao({ tarefa, agora }: { tarefa: TarefaCard; agora: Date }) {
  const atrasada = tarefaAtrasada(tarefa.vencimento, tarefa.concluidaEm, agora);
  return (
    <Link href={`/processos/${tarefa.processo.id}?aba=tarefas`} className={`cartao-agenda ${classeTipo(tarefa.tipo.slug, atrasada)}`}>
      <strong>{tarefa.processo.titulo}</strong>
      <span className="muted">{tarefa.processo.codigo} · {rota(tarefa.processo)}</span>
      <span className="tipo">{tarefa.tipo.rotulo}</span>
      <span>{tarefa.titulo}</span>
      <small>{formatarDataHora(tarefa.vencimento)} · {tarefa.responsavel?.nome || "sem responsável"}</small>
    </Link>
  );
}

function Quadro({ tarefas, ancora }: { tarefas: TarefaCard[]; ancora: string }) {
  const agora = new Date();
  const amanha = deslocar(ancora, 1);
  const fimSemana = deslocar(ancora, 8);
  const colunas = [
    { id: "atraso", titulo: "Eventos atrasados", itens: tarefas.filter((tarefa) => diaSp(tarefa.vencimento) < ancora) },
    { id: "hoje", titulo: "Hoje", itens: tarefas.filter((tarefa) => diaSp(tarefa.vencimento) === ancora) },
    { id: "amanha", titulo: "Amanhã", itens: tarefas.filter((tarefa) => diaSp(tarefa.vencimento) === amanha) },
    { id: "semana", titulo: "Próxima semana", itens: tarefas.filter((tarefa) => { const dia = diaSp(tarefa.vencimento); return dia > amanha && dia <= fimSemana; }) },
    { id: "futuro", titulo: "Futuro", itens: tarefas.filter((tarefa) => diaSp(tarefa.vencimento) > fimSemana) },
  ];
  return (
    <div className="agenda-quadro">
      {colunas.map((coluna) => (
        <section key={coluna.id} className={`cartao agenda-coluna ${coluna.id}`}>
          <header>
            <h2>{coluna.titulo}</h2>
            <em>{coluna.itens.length}</em>
          </header>
          {coluna.itens.length === 0 ? <p className="muted">Nenhum evento</p> : null}
          {coluna.itens.map((tarefa) => <Cartao key={tarefa.id} tarefa={tarefa} agora={agora} />)}
        </section>
      ))}
    </div>
  );
}

function Lista({ tarefas, ancora }: { tarefas: TarefaCard[]; ancora: string }) {
  return (
    <div className="tabela-wrap cartao agenda-lista">
      <table>
        <thead>
          <tr>
            <th>Data de vencimento</th>
            <th>Responsável</th>
            <th>Objeto</th>
            <th>Tipo de evento</th>
            <th>Comentário</th>
          </tr>
        </thead>
        <tbody>
          {tarefas.length === 0 ? <tr><td colSpan={5}>Nenhuma tarefa neste filtro.</td></tr> : null}
          {tarefas.map((tarefa) => {
            const dia = diaSp(tarefa.vencimento);
            const destaque = !tarefa.concluidaEm && dia <= ancora;
            return (
              <tr key={tarefa.id} className={destaque ? "data-quente" : undefined}>
                <td>{formatarDataHora(tarefa.vencimento)}</td>
                <td>{tarefa.responsavel?.nome || "—"}</td>
                <td><Link href={`/processos/${tarefa.processo.id}`}>{tarefa.processo.codigo} · {rota(tarefa.processo)}</Link></td>
                <td><span className={`selo-tipo ${classeTipo(tarefa.tipo.slug, destaque && dia < ancora)}`}>{tarefa.tipo.rotulo}</span></td>
                <td>{tarefa.titulo}{tarefa.descricao ? ` — ${tarefa.descricao}` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Semana({ tarefas, inicio, somente }: { tarefas: TarefaCard[]; inicio: string; somente: string | null }) {
  const dias = Array.from({ length: 7 }, (_, indice) => deslocar(inicio, indice)).filter((dia) => !somente || dia === somente);
  const agora = new Date();
  return (
    <div className="agenda-semana">
      <div className="semana-grade" style={{ gridTemplateColumns: `72px repeat(${dias.length}, minmax(120px, 1fr))` }}>
        <div className="semana-canto">Dia todo</div>
        {dias.map((dia) => (
          <div key={dia} className="semana-topo">
            <strong>{DIAS[(new Date(`${dia}T12:00:00-03:00`).getUTCDay() + 6) % 7]} {dia.slice(8)}</strong>
            <div className="semana-todo">
              {tarefas.filter((tarefa) => {
                if (diaSp(tarefa.vencimento) !== dia) return false;
                const { hora } = partesSp(tarefa.vencimento);
                return hora < 7 || hora > 21;
              }).map((tarefa) => (
                <Link key={tarefa.id} href={`/processos/${tarefa.processo.id}?aba=tarefas`} className={`bloco-todo ${classeTipo(tarefa.tipo.slug, tarefaAtrasada(tarefa.vencimento, tarefa.concluidaEm, agora))}`}>
                  {tarefa.processo.codigo} · {tarefa.tipo.rotulo}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="semana-horas">
          {HORAS.map((hora) => <div key={hora}>{String(hora).padStart(2, "0")}:00</div>)}
        </div>
        {dias.map((dia) => (
          <div key={`${dia}-col`} className="semana-coluna">
            {HORAS.map((hora) => <div key={hora} className="semana-linha" />)}
            {tarefas.filter((tarefa) => {
              if (diaSp(tarefa.vencimento) !== dia) return false;
              const { hora } = partesSp(tarefa.vencimento);
              return hora >= 7 && hora <= 21;
            }).map((tarefa) => {
              const { hora, minuto } = partesSp(tarefa.vencimento);
              const atrasada = tarefaAtrasada(tarefa.vencimento, tarefa.concluidaEm, agora);
              return (
                <Link
                  key={tarefa.id}
                  href={`/processos/${tarefa.processo.id}?aba=tarefas`}
                  className={`bloco-hora ${classeTipo(tarefa.tipo.slug, atrasada)}`}
                  style={{ top: `${(hora - 7) * 48 + (minuto / 60) * 48}px` }}
                >
                  <strong>{tarefa.processo.codigo}</strong>
                  <span>{tarefa.tipo.rotulo}: {tarefa.titulo}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Mes({ tarefas, ancora }: { tarefas: TarefaCard[]; ancora: string }) {
  const inicio = `${ancora.slice(0, 8)}01`;
  const dias = Array.from({ length: 31 }, (_, indice) => deslocar(inicio, indice)).filter((dia) => dia.startsWith(ancora.slice(0, 7)));
  return (
    <div className="calendario mes">
      {dias.map((dia) => (
        <section key={dia} className="cartao">
          <h2>{dia.slice(8)}</h2>
          {tarefas.filter((tarefa) => diaSp(tarefa.vencimento) === dia).map((tarefa) => (
            <Link key={tarefa.id} href={`/processos/${tarefa.processo.id}?aba=tarefas`} className={tarefaAtrasada(tarefa.vencimento, tarefa.concluidaEm) ? "chip atrasada" : "chip"}>
              {tarefa.tipo.rotulo}: {tarefa.titulo}
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}
