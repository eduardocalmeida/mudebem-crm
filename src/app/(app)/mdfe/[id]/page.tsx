import Link from "next/link";
import { notFound } from "next/navigation";
import { UFS } from "@/lib/format";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { cancelarMdfeAction, emitirMdfeAction, encerrarMdfeAction, salvarMdfeAction } from "@/server/actions-mdfe";
import { obterMdfe, rascunhoDe, totaisDo } from "@/server/mdfe/mdfe";
import { montarPayloadMdfe } from "@/server/mdfe/webmania";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "MDF-e" };

export default async function MdfeDetalhe({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  await exigirUsuario();
  const { id } = await params;
  const { aviso } = await searchParams;
  const mdfe = await obterMdfe(id).catch((erro: unknown) => {
    if (erro instanceof AppError && erro.status === 404) return null;
    throw erro;
  });
  if (!mdfe) notFound();
  const outros = await prisma.cte.findMany({
    where: { processoId: mdfe.processoId },
    select: { id: true, numero: true, chave: true, municipioFim: true },
    orderBy: { criadoEm: "asc" },
  });
  const ligados = new Set(mdfe.documentos.map((documento) => documento.cte.id));
  const totais = totaisDo(mdfe);
  const pedido = montarPayloadMdfe(rascunhoDe(mdfe));
  const moeda = (valor: number | null) => (valor == null ? "" : valor.toFixed(2).replace(".", ","));
  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">MDF-e rodoviário · {mdfe.status}</p>
          <h1>{mdfe.municipioCarregamento || "Carregamento"} → {mdfe.municipioDescarregamento || "Descarregamento"}</h1>
          <p className="muted">
            <Link href={`/processos/${mdfe.processo.id}`}>{mdfe.processo.codigo}</Link>
            {" · "}
            {totais.ctes} CT-e · cubagem {String(totais.cubagemM3).replace(".", ",")} m³ · serviço {moeda(totais.valorServico) || "—"}
          </p>
        </div>
      </header>
      {aviso ? <p className="faixa-exemplo">{aviso}</p> : null}
      {mdfe.mensagemProvedor ? <p className="muted">{mdfe.mensagemProvedor}</p> : null}
      <p className="muted">O certificado A1 fica no painel da WebmaniaBR. Este manifesto só monta o JSON de homologação.</p>
      <form action={salvarMdfeAction} className="grade-form">
        <input type="hidden" name="id" value={mdfe.id} />
        <label className="campo"><span>UF início</span><select name="ufInicio" defaultValue={mdfe.ufInicio || ""}>{ufs()}</select></label>
        <label className="campo"><span>UF fim</span><select name="ufFim" defaultValue={mdfe.ufFim || ""}>{ufs()}</select></label>
        <label className="campo largo"><span>Percurso, UFs intermediárias separadas por vírgula</span><input name="percurso" defaultValue={mdfe.percurso || ""} placeholder="MG, SP" /></label>
        <label className="campo"><span>Município de carregamento</span><input name="municipioCarregamento" defaultValue={mdfe.municipioCarregamento || ""} /></label>
        <label className="campo"><span>Município de descarregamento</span><input name="municipioDescarregamento" defaultValue={mdfe.municipioDescarregamento || ""} /></label>
        <label className="campo"><span>Placa</span><input name="placa" defaultValue={mdfe.placa || ""} /></label>
        <label className="campo"><span>RENAVAM</span><input name="renavam" defaultValue={mdfe.renavam || ""} /></label>
        <label className="campo"><span>Tara (kg)</span><input name="taraKg" defaultValue={mdfe.taraKg ?? ""} /></label>
        <label className="campo"><span>Capacidade (kg)</span><input name="capacidadeKg" defaultValue={mdfe.capacidadeKg ?? ""} /></label>
        <label className="campo"><span>Capacidade (m³)</span><input name="capacidadeM3" defaultValue={mdfe.capacidadeM3 ?? ""} /></label>
        <label className="campo"><span>Condutor</span><input name="condutorNome" defaultValue={mdfe.condutorNome || ""} /></label>
        <label className="campo"><span>CPF do condutor</span><input name="condutorCpf" defaultValue={mdfe.condutorCpf || ""} /></label>
        <label className="campo"><span>RNTRC / ANTT</span><input name="rntrc" defaultValue={mdfe.rntrc || ""} /></label>
        <label className="campo"><span>Seguradora</span><input name="seguradoraNome" defaultValue={mdfe.seguradoraNome || ""} /></label>
        <label className="campo"><span>CNPJ da seguradora</span><input name="seguradoraCnpj" defaultValue={mdfe.seguradoraCnpj || ""} /></label>
        <label className="campo"><span>Apólice</span><input name="apolice" defaultValue={mdfe.apolice || ""} /></label>
        <label className="campo"><span>Averbações, separadas por vírgula</span><input name="averbacao" defaultValue={mdfe.averbacao || ""} /></label>
        <label className="campo"><span>Valor da carga</span><input name="valorCarga" defaultValue={moeda(totais.valorCarga)} /></label>
        <label className="campo"><span>Peso bruto (kg)</span><input name="pesoBruto" defaultValue={mdfe.pesoBruto == null ? "" : String(mdfe.pesoBruto)} /></label>
        <fieldset className="limpo campo largo">
          <legend>CT-e desta viagem</legend>
          {outros.map((cte) => (
            <label key={cte.id} className="check">
              <input type="checkbox" name="cteId" value={cte.id} defaultChecked={ligados.has(cte.id)} />
              {cte.numero || "Rascunho"} · {cte.municipioFim || "sem município"} · {cte.chave ? "com chave" : "sem chave"}
            </label>
          ))}
        </fieldset>
        {mdfe.status === "RASCUNHO" ? <button className="btn" type="submit">Salvar manifesto</button> : null}
      </form>
      {pedido.pendencias.length > 0 ? (
        <ul>{pedido.pendencias.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : (
        <p className="muted">O pedido do MDF-e está completo para montar o JSON.</p>
      )}
      <div className="linha">
        <form action={emitirMdfeAction}><input type="hidden" name="id" value={mdfe.id} /><button className="btn" type="submit">Emitir</button></form>
        <form action={encerrarMdfeAction}><input type="hidden" name="id" value={mdfe.id} /><button className="btn secundario" type="submit">Encerrar</button></form>
        <form action={cancelarMdfeAction} className="campo">
          <input type="hidden" name="id" value={mdfe.id} />
          <input name="justificativa" placeholder="Justificativa do cancelamento" />
          <button className="btn secundario" type="submit">Cancelar</button>
        </form>
        {mdfe.damdfeUrl ? <a className="btn secundario" href={mdfe.damdfeUrl}>DAMDFE</a> : null}
      </div>
    </>
  );
}

function ufs() {
  return (
    <>
      <option value="">—</option>
      {UFS.map((uf) => (
        <option key={uf}>{uf}</option>
      ))}
    </>
  );
}
