import Link from "next/link";
import { BarraFiltros } from "@/components/barra-filtros";
import { QuadroKanban } from "@/components/kanban";
import { SeloEtapa, SeloExemplo } from "@/components/selos";
import { lerFiltro, parametrosDe, type FiltroLista } from "@/lib/consulta";
import { podeCriarProcesso, rotuloCanal } from "@/lib/domain";
import { carregarEtapas } from "@/server/etapas";
import { AppError } from "@/lib/errors";
import { formatarBRL, formatarData, localidade } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { listarProcessos } from "@/server/processos";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Oportunidades" };

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirUsuario();
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(sp)) {
    if (typeof valor === "string") params.set(chave, valor);
  }

  let erro: string | null = null;
  let filtro: FiltroLista = { pagina: 1, porPagina: 50, visao: params.get("visao") === "lista" ? "lista" : "kanban" };
  try {
    filtro = lerFiltro(params);
  } catch (falha) {
    erro = falha instanceof AppError ? falha.message : "Filtro inválido.";
  }

  const [responsaveis, lista, etapas] = await Promise.all([
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    listarProcessos({
      ...filtro,
      limite: filtro.visao === "kanban" ? 300 : undefined,
    }),
    carregarEtapas(),
  ]);
  const etapasVisiveis = etapas.filter((etapa) => etapa.ativa);

  const colunas = etapasVisiveis.map((etapa) => ({
    id: etapa.slug,
    rotulo: etapa.rotulo,
    cor: etapa.cor,
    total: lista.contagem[etapa.slug] ?? 0,
    cartoes: lista.dados
      .filter((processo) => processo.etapa === etapa.slug)
      .map((processo) => ({
        id: processo.id,
        codigo: processo.codigo,
        titulo: processo.titulo,
        cliente: processo.cliente.nome,
        rota: `${localidade(processo.origem.cidade, processo.origem.uf)} → ${localidade(processo.destino.cidade, processo.destino.uf)}`,
        valor: formatarBRL(processo.valorAprovado ?? processo.valorCotado) === "—" ? "A precificar" : formatarBRL(processo.valorAprovado ?? processo.valorCotado),
        coleta: processo.dataColeta ? formatarData(processo.dataColeta) : null,
        responsavel: processo.responsavel?.nome ?? null,
        exemplo: processo.exemplo,
      })),
  }));

  const totalPaginas = Math.max(1, Math.ceil(lista.total / lista.porPagina));
  const base = { ...filtro, pagina: undefined as number | undefined };

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Comercial</p>
          <h1>Oportunidades</h1>
          <p className="muted">{lista.total} processo(s) com os filtros atuais.</p>
        </div>
        <div className="linha">
          <div className="visoes">
            <Link className={filtro.visao === "kanban" ? "ativo" : undefined} href={`/processos${parametrosDe({ ...base, visao: "kanban" })}`}>
              Kanban
            </Link>
            <Link className={filtro.visao === "lista" ? "ativo" : undefined} href={`/processos${parametrosDe({ ...base, visao: "lista" })}`}>
              Lista
            </Link>
          </div>
          {podeCriarProcesso(usuario.papel) ? (
            <Link className="btn primario" href="/processos/novo">
              Nova oportunidade
            </Link>
          ) : null}
        </div>
      </header>
      {erro ? <p className="alerta">{erro}</p> : null}
      <BarraFiltros filtro={filtro} etapas={etapasVisiveis.map((etapa) => ({ slug: etapa.slug, rotulo: etapa.rotulo }))} responsaveis={responsaveis} />
      {filtro.visao === "kanban" ? (
        <>
          {lista.total > 300 ? <p className="alerta">O quadro mostra os 300 processos mais recentes deste filtro.</p> : null}
          <QuadroKanban colunas={colunas} papel={usuario.papel} etapas={etapas} />
        </>
      ) : (
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Processo</th>
                <th>Etapa</th>
                <th>Rota</th>
                <th>Coleta</th>
                <th>Valor</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {lista.dados.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum processo com esses filtros.</td>
                </tr>
              ) : null}
              {lista.dados.map((processo) => (
                <tr key={processo.id}>
                  <td>
                    <Link href={`/processos/${processo.id}`}>{processo.codigo}</Link>
                    {processo.exemplo ? (
                      <>
                        {" "}
                        <SeloExemplo />
                      </>
                    ) : null}
                  </td>
                  <td>
                    <Link href={`/processos/${processo.id}`}>
                      <strong>{processo.cliente.nome}</strong>
                    </Link>
                    <div className="muted">{rotuloCanal(processo.canal)}</div>
                  </td>
                  <td>
                    <SeloEtapa etapa={processo.etapa} />
                  </td>
                  <td>
                    {localidade(processo.origem.cidade, processo.origem.uf)} → {localidade(processo.destino.cidade, processo.destino.uf)}
                  </td>
                  <td>{formatarData(processo.dataColeta)}</td>
                  <td>{formatarBRL(processo.valorAprovado ?? processo.valorCotado)}</td>
                  <td>{processo.responsavel?.nome ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="paginacao">
            {filtro.pagina > 1 ? (
              <Link href={`/processos${parametrosDe({ ...filtro, pagina: filtro.pagina - 1 })}`}>Anterior</Link>
            ) : null}
            <span>
              Página {filtro.pagina} de {totalPaginas}
            </span>
            {filtro.pagina < totalPaginas ? (
              <Link href={`/processos${parametrosDe({ ...filtro, pagina: filtro.pagina + 1 })}`}>Próxima</Link>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
