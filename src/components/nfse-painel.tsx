import { AbaCte } from "@/components/cte-painel";
import {
  cancelarNfseAction,
  escolherDocumentoAction,
  emitirNfseAction,
  salvarCodigoServicoAction,
  salvarNfseAction,
} from "@/server/actions-nfse";
import { lerEscolhaFiscal, listarCodigosServico, obterOuPreencherNfse, rascunhoDe, valorDoIss } from "@/server/nfse/nfse";
import { montarPayloadNfse } from "@/server/nfse/webmania";
import { UFS } from "@/lib/format";

export async function AbaFiscal({
  processoId,
  aviso,
  secao,
  admin,
}: {
  processoId: string;
  aviso?: string;
  secao?: string;
  admin: boolean;
}) {
  const escolha = await lerEscolhaFiscal(processoId);
  return (
    <section>
      <form action={escolherDocumentoAction} className="cartao painel-aba">
        <h2>Documento fiscal</h2>
        <p className="muted">
          {escolha.sugerido === "NFSE"
            ? "Origem e destino no mesmo município: a sugestão é NFS-e."
            : escolha.sugerido === "CTE"
              ? "Municípios diferentes: a sugestão é CT-e."
              : "Informe os dois municípios para sugerir o documento."}
          {escolha.documentoFiscalManual ? " A escolha atual foi definida manualmente." : " A sugestão está valendo."}
        </p>
        <input type="hidden" name="processoId" value={processoId} />
        <div className="linha">
          <label className="check"><input type="radio" name="documento" value="NFSE" defaultChecked={escolha.efetivo === "NFSE"} /> NFS-e</label>
          <label className="check"><input type="radio" name="documento" value="CTE" defaultChecked={escolha.efetivo === "CTE"} /> CT-e</label>
          <button className="btn" type="submit">Usar esta escolha</button>
        </div>
      </form>
      <form action={escolherDocumentoAction}>
        <input type="hidden" name="processoId" value={processoId} />
        <input type="hidden" name="documento" value="" />
        <button className="btn secundario" type="submit">Voltar à sugestão</button>
      </form>
      {aviso ? <p className="faixa-exemplo">{aviso}</p> : null}
      {escolha.efetivo === "NFSE" ? <Nota processoId={processoId} admin={admin} /> : <AbaCte processoId={processoId} aviso={aviso} secao={secao} />}
    </section>
  );
}

async function Nota({ processoId, admin }: { processoId: string; admin: boolean }) {
  const [nfse, codigos] = await Promise.all([obterOuPreencherNfse(processoId), listarCodigosServico()]);
  const pedido = montarPayloadNfse(rascunhoDe(nfse));
  const iss = valorDoIss(nfse.valorServicos == null ? null : Number(nfse.valorServicos), nfse.aliquotaIss == null ? null : Number(nfse.aliquotaIss));
  const moeda = (valor: { toString(): string } | number | null) => (valor == null ? "" : Number(valor).toFixed(2).replace(".", ","));
  return (
    <section className="cartao painel-aba">
      <h2>NFS-e · {nfse.status}</h2>
      <p className="muted">
        Prestador: {nfse.prestadorNome || "cadastro da conta WebmaniaBR"}
        {nfse.prestadorMunicipio ? ` · ${nfse.prestadorMunicipio}/${nfse.prestadorUf || ""}` : ""}
        {nfse.prestadorIbge ? ` · IBGE ${nfse.prestadorIbge}` : ""}. O município do prestador vem das configurações da empresa.
        {nfse.numero ? ` Número ${nfse.numero}.` : ""}
        {nfse.codigoVerificacao ? ` Verificação ${nfse.codigoVerificacao}.` : ""}
      </p>
      {nfse.mensagemProvedor ? <p className="muted">{nfse.mensagemProvedor}</p> : null}
      <form action={salvarNfseAction} className="grade-form">
        <input type="hidden" name="processoId" value={processoId} />
        <input type="hidden" name="id" value={nfse.id} />
        <label className="campo"><span>Tomador</span><input name="tomadorNome" defaultValue={nfse.tomadorNome || ""} /></label>
        <label className="campo"><span>CPF ou CNPJ</span><input name="tomadorDocumento" defaultValue={nfse.tomadorDocumento || ""} /></label>
        <label className="campo"><span>E-mail</span><input name="tomadorEmail" defaultValue={nfse.tomadorEmail || ""} /></label>
        <label className="campo"><span>Endereço</span><input name="tomadorEndereco" defaultValue={nfse.tomadorEndereco || ""} /></label>
        <label className="campo"><span>Número</span><input name="tomadorNumero" defaultValue={nfse.tomadorNumero || ""} /></label>
        <label className="campo"><span>Bairro</span><input name="tomadorBairro" defaultValue={nfse.tomadorBairro || ""} /></label>
        <label className="campo"><span>Cidade</span><input name="tomadorCidade" defaultValue={nfse.tomadorCidade || ""} /></label>
        <label className="campo"><span>UF</span><select name="tomadorUf" defaultValue={nfse.tomadorUf || ""}><option value="">—</option>{UFS.map((uf) => <option key={uf}>{uf}</option>)}</select></label>
        <label className="campo"><span>CEP</span><input name="tomadorCep" defaultValue={nfse.tomadorCep || ""} /></label>
        <label className="campo"><span>Município do prestador</span><input name="prestadorMunicipio" defaultValue={nfse.prestadorMunicipio || "Goiânia"} /></label>
        <label className="campo"><span>UF do prestador</span><input name="prestadorUf" defaultValue={nfse.prestadorUf || "GO"} /></label>
        <label className="campo"><span>IBGE do prestador</span><input name="prestadorIbge" defaultValue={nfse.prestadorIbge || "5208707"} /></label>
        <label className="campo"><span>Município da prestação</span><input name="municipioPrestacao" defaultValue={nfse.municipioPrestacao || ""} /></label>
        <label className="campo"><span>Código do serviço</span>
          <select name="codigoServico" defaultValue={nfse.codigoServico || ""}>
            {codigos.map((codigo) => <option key={codigo.codigo} value={codigo.codigo}>{codigo.codigo} — {codigo.descricao}</option>)}
          </select>
        </label>
        <label className="campo"><span>CNAE</span><input name="cnae" defaultValue={nfse.cnae || ""} /></label>
        <label className="campo"><span>Valor dos serviços</span><input name="valorServicos" defaultValue={moeda(nfse.valorServicos)} /></label>
        <label className="campo"><span>Deduções</span><input name="deducoes" defaultValue={moeda(nfse.deducoes)} /></label>
        <label className="campo"><span>Alíquota ISS (%)</span><input name="aliquotaIss" defaultValue={moeda(nfse.aliquotaIss)} /></label>
        <p className="muted">ISS calculado: {iss == null ? "—" : moeda(iss)}</p>
        <label className="check"><input type="checkbox" name="issRetido" defaultChecked={nfse.issRetido} /> ISS retido</label>
        <label className="campo"><span>PIS (%)</span><input name="aliquotaPis" defaultValue={moeda(nfse.aliquotaPis)} /></label>
        <label className="campo"><span>COFINS (%)</span><input name="aliquotaCofins" defaultValue={moeda(nfse.aliquotaCofins)} /></label>
        <label className="campo"><span>CSLL (%)</span><input name="aliquotaCsll" defaultValue={moeda(nfse.aliquotaCsll)} /></label>
        <label className="campo"><span>IR (%)</span><input name="aliquotaIr" defaultValue={moeda(nfse.aliquotaIr)} /></label>
        <label className="campo"><span>INSS (%)</span><input name="aliquotaInss" defaultValue={moeda(nfse.aliquotaInss)} /></label>
        <label className="campo"><span>IBS/CBS situação</span><input name="ibsSituacao" defaultValue={nfse.ibsSituacao || ""} placeholder="000" /></label>
        <label className="campo"><span>Classificação tributária</span><input name="ibsClassificacao" defaultValue={nfse.ibsClassificacao || ""} /></label>
        <label className="campo largo"><span>Discriminação</span><textarea name="discriminacao" defaultValue={nfse.discriminacao || ""} /></label>
        {nfse.status === "RASCUNHO" ? <button className="btn" type="submit">Salvar NFS-e</button> : null}
      </form>
      {pedido.pendencias.length > 0 ? <ul>{pedido.pendencias.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">O pedido da NFS-e está completo para montar o JSON.</p>}
      <div className="linha">
        <form action={emitirNfseAction}><input type="hidden" name="processoId" value={processoId} /><button className="btn" type="submit">Emitir</button></form>
        <form action={cancelarNfseAction}>
          <input type="hidden" name="processoId" value={processoId} />
          <input type="hidden" name="id" value={nfse.id} />
          <select name="motivo" defaultValue="1">
            <option value="1">1 — Erro na emissão</option>
            <option value="2">2 — Serviço não prestado</option>
            <option value="4">4 — Duplicidade</option>
          </select>
          <button className="btn secundario" type="submit">Cancelar</button>
        </form>
        {nfse.pdfUrl ? <a className="btn secundario" href={nfse.pdfUrl}>PDF</a> : null}
        {nfse.xmlUrl ? <a className="btn secundario" href={nfse.xmlUrl}>XML</a> : null}
      </div>
      {admin ? (
        <div>
          <h3>Códigos de serviço</h3>
          {codigos.map((codigo) => (
            <form key={codigo.id} action={salvarCodigoServicoAction} className="linha">
              <input type="hidden" name="processoId" value={processoId} />
              <input type="hidden" name="codigoId" value={codigo.id} />
              <strong>{codigo.codigo}</strong>
              <input name="descricao" defaultValue={codigo.descricao} />
              <input name="cnae" defaultValue={codigo.cnae || ""} />
              <input name="aliquotaIss" defaultValue={codigo.aliquotaIss == null ? "" : Number(codigo.aliquotaIss).toFixed(2).replace(".", ",")} />
              <label className="check"><input type="checkbox" name="padrao" defaultChecked={codigo.padrao} /> Padrão</label>
              <button className="btn secundario" type="submit">Salvar código</button>
            </form>
          ))}
        </div>
      ) : null}
    </section>
  );
}
