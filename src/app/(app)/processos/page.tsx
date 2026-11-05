import Link from "next/link";
import { QuadroKanban } from "@/components/kanban";
import { SeloEtapa, SeloExemplo } from "@/components/selos";
import { lerFiltro, parametrosDe, type FiltroLista } from "@/lib/consulta";
import { CANAIS, ETAPAS, podeCriarProcesso, rotuloCanal } from "@/lib/domain";
import { AppError } from "@/lib/errors";
import { formatarBRL, formatarData, localidade } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { listarProcessos } from "@/server/processos";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Processos" };

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

  const [clientes, responsaveis, lista] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    listarProcessos({
      ...filtro,
      limite: filtro.visao === "kanban" ? 300 : undefined,
    }),
  ]);

  const colunas = ETAPAS.map((etapa) => ({
    id: etapa.id,
    rotulo: etapa.rotulo,
    cor: etapa.cor,
    cartoes: lista.dados
      .filter((processo) => processo.etapa === etapa.id)
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
          <h1>Processos</h1>
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
              Novo processo
            </Link>
          ) : null}
        </div>
      </header>
      {erro ? <p className="alerta">{erro}</p> : null}
      <form className="filtros" method="get">
        <input type="hidden" name="visao" value={filtro.visao} />
        <label className="campo">
          <span>Busca</span>
          <input name="q" defaultValue={filtro.q ?? ""} placeholder="Código, cliente, cidade, OC, NF" />
        </label>
        <label className="campo">
          <span>Etapa</span>
          <select name="etapa" defaultValue={filtro.etapa ?? ""}>
            <option value="">Todas</option>
            {ETAPAS.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Cliente</span>
          <select name="clienteId" defaultValue={filtro.clienteId ?? ""}>
            <option value="">Todos</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Responsável</span>
          <select name="responsavelId" defaultValue={filtro.responsavelId ?? ""}>
            <option value="">Todos</option>
            {responsaveis.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Canal</span>
          <select name="canal" defaultValue={filtro.canal ?? ""}>
            <option value="">Todos</option>
            {CANAIS.map((canal) => (
              <option key={canal.id} value={canal.id}>
                {canal.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Coleta de</span>
          <input name="de" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" defaultValue={filtro.dataColetaDe ? formatarData(filtro.dataColetaDe) : ""} />
        </label>
        <label className="campo">
          <span>Coleta até</span>
          <input name="ate" type="text" inputMode="numeric" placeholder="dd/mm/aaaa" defaultValue={filtro.dataColetaAte ? formatarData(filtro.dataColetaAte) : ""} />
        </label>
        <button className="btn secundario" type="submit">
          Filtrar
        </button>
        <Link className="btn secundario" href={`/processos?visao=${filtro.visao}`}>
          Limpar
        </Link>
      </form>
      {filtro.visao === "kanban" ? (
        <>
          {lista.total > 300 ? <p className="alerta">O quadro mostra os 300 processos mais recentes deste filtro.</p> : null}
          <QuadroKanban colunas={colunas} papel={usuario.papel} />
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
                      <strong>{processo.titulo}</strong>
                    </Link>
                    <div className="muted">
                      {processo.cliente.nome} · {rotuloCanal(processo.canal)}
                    </div>
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
