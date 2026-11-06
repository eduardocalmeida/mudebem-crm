import Link from "next/link";
import { atualizarRegraTarefaAction } from "@/server/actions-operacao";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { garantirTarefasPadrao, listarTarefas, tarefaAtrasada } from "@/server/tarefas";
import { exigirUsuario } from "@/server/session";

function diaSp(data: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(data);
}

function deslocar(iso: string, dias: number) {
  const data = new Date(`${iso}T12:00:00-03:00`);
  data.setUTCDate(data.getUTCDate() + dias);
  return diaSp(data);
}

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string; quem?: string; data?: string }>;
}) {
  const usuario = await exigirUsuario();
  await garantirTarefasPadrao();
  const regras = usuario.papel === "ADMIN"
    ? await prisma.regraTarefa.findMany({ include: { tipo: true }, orderBy: { etapaSlug: "asc" } })
    : [];
  const consulta = await searchParams;
  const visao = consulta.visao === "semana" || consulta.visao === "dia" || consulta.visao === "mes" || consulta.visao === "lista" ? consulta.visao : "semana";
  const quem = consulta.quem === "equipe" ? "equipe" : "eu";
  const ancora = /^\d{4}-\d{2}-\d{2}$/.test(consulta.data || "") ? consulta.data! : diaSp(new Date());
  const inicio = visao === "mes" ? `${ancora.slice(0, 8)}01` : visao === "semana" ? deslocar(ancora, -((new Date(`${ancora}T12:00:00-03:00`).getUTCDay() + 6) % 7)) : ancora;
  const fim = visao === "mes" ? deslocar(`${ancora.slice(0, 8)}01`, 32).slice(0, 8) + "01" : visao === "semana" ? deslocar(inicio, 7) : deslocar(ancora, 1);
  const tarefas = await listarTarefas({
    responsavelId: quem === "eu" ? usuario.id : undefined,
    de: visao === "lista" ? undefined : new Date(`${inicio}T00:00:00-03:00`),
    ate: visao === "lista" ? undefined : new Date(`${fim}T00:00:00-03:00`),
  });
  const base = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ visao, quem, data: ancora, ...extra });
    return `/tarefas?${params.toString()}`;
  };
  const dias = visao === "dia" ? [ancora] : visao === "semana" ? Array.from({ length: 7 }, (_, i) => deslocar(inicio, i)) : [];

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Agenda</p>
          <h1>Calendário</h1>
        </div>
      </header>
      <p className="linha">
        <Link className={visao === "lista" ? "btn" : "btn secundario"} href={base({ visao: "lista" })}>Lista</Link>
        <Link className={visao === "dia" ? "btn" : "btn secundario"} href={base({ visao: "dia" })}>Dia</Link>
        <Link className={visao === "semana" ? "btn" : "btn secundario"} href={base({ visao: "semana" })}>Semana</Link>
        <Link className={visao === "mes" ? "btn" : "btn secundario"} href={base({ visao: "mes" })}>Mês</Link>
        <Link className={quem === "eu" ? "btn" : "btn secundario"} href={base({ quem: "eu" })}>Minhas</Link>
        <Link className={quem === "equipe" ? "btn" : "btn secundario"} href={base({ quem: "equipe" })}>Equipe</Link>
        {visao !== "lista" ? (
          <>
            <Link className="btn secundario" href={base({ data: deslocar(ancora, visao === "mes" ? -30 : visao === "semana" ? -7 : -1) })}>Anterior</Link>
            <Link className="btn secundario" href={base({ data: deslocar(ancora, visao === "mes" ? 30 : visao === "semana" ? 7 : 1) })}>Próxima</Link>
          </>
        ) : null}
      </p>
      {visao === "lista" ? (
        <ul className="lista-tarefas">
          {tarefas.map((tarefa) => (
            <li key={tarefa.id} className={tarefaAtrasada(tarefa.vencimento, tarefa.concluidaEm) ? "atrasada" : ""}>
              <div>
                <strong>{tarefa.titulo}</strong>
                <div className="muted">
                  {tarefa.tipo.rotulo} · {formatarDataHora(tarefa.vencimento)} · {tarefa.responsavel?.nome || "sem responsável"} ·{" "}
                  <Link href={`/processos/${tarefa.processo.id}`}>{tarefa.processo.codigo}</Link>
                  {tarefa.concluidaEm ? " · concluída" : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={visao === "mes" ? "calendario mes" : "calendario"}>
          {(visao === "mes"
            ? Array.from({ length: 31 }, (_, i) => deslocar(`${ancora.slice(0, 8)}01`, i)).filter((dia) => dia.startsWith(ancora.slice(0, 7)))
            : dias
          ).map((dia) => (
            <section key={dia}>
              <h2>{dia.split("-").reverse().join("/")}</h2>
              {tarefas
                .filter((tarefa) => diaSp(tarefa.vencimento) === dia)
                .map((tarefa) => (
                  <Link
                    key={tarefa.id}
                    href={`/processos/${tarefa.processo.id}?aba=tarefas`}
                    className={tarefaAtrasada(tarefa.vencimento, tarefa.concluidaEm) ? "chip atrasada" : "chip"}
                  >
                    {tarefa.titulo}
                  </Link>
                ))}
            </section>
          ))}
        </div>
      )}
      {regras.length > 0 ? (
        <section className="cartao">
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
