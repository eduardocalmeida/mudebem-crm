import Link from "next/link";
import { criarMdfeAction } from "@/server/actions-mdfe";
import {
  cancelarCteAction,
  corrigirCteAction,
  duplicarCteAction,
  emitirCteAction,
  repreencherCteAction,
  salvarCteAction,
} from "@/server/actions-operacao";
import { obterOuPreencherCte, urlDacte } from "@/server/cte/cte";
import { CFOPS, CONTRIBUICOES, CST_IBS, MODAIS, REGIMES, SECOES_CTE, SITUACOES_ICMS, TIPOS_CTE, TIPOS_DOCUMENTO, TIPOS_SERVICO, TOMADORES } from "@/server/cte/opcoes";
import { lerRascunho, type AtorCte } from "@/server/cte/rascunho";
import { montarPayloadWebmania } from "@/server/cte/webmania";
import { UFS } from "@/lib/format";

function moeda(valor: number | null) {
  return valor == null ? "" : valor.toFixed(2).replace(".", ",");
}

export async function AbaCte({ processoId, aviso, secao }: { processoId: string; aviso?: string; secao?: string }) {
  const cte = await obterOuPreencherCte(processoId);
  const rascunho = lerRascunho(cte.rascunho);
  const ativa = SECOES_CTE.some(([id]) => id === secao) ? secao! : "identificacao";
  const pedido = montarPayloadWebmania(rascunho);
  return (
    <section className="cartao">
      <h2>CT-e</h2>
      <p className="muted">
        Rascunho no formato da tela da Martins. O envio usa a WebmaniaBR e ainda não sai deste servidor. O certificado A1 fica no painel deles.
        Status {cte.status}
        {cte.chave ? ` · chave ${cte.chave}` : ""}. O MDF-e fica para a etapa seguinte.
      </p>
      {aviso ? <p className="faixa-exemplo">{aviso}</p> : null}
      {cte.mensagemProvedor ? <p className="muted">{cte.mensagemProvedor}</p> : null}
      <nav className="abas">
        {SECOES_CTE.map(([id, rotulo]) => (
          <Link key={id} className={ativa === id ? "ativa" : ""} href={`/processos/${processoId}?aba=cte&secao=${id}`}>
            {rotulo}
          </Link>
        ))}
      </nav>
      {ativa === "acoes" ? (
        <Acoes cteId={cte.id} processoId={processoId} chave={cte.chave} pendencias={pedido.pendencias} dacte={cte.dacteUrl || urlDacte(cte.chave)} />
      ) : (
        <form action={salvarCteAction} className="grade-form">
          <input type="hidden" name="processoId" value={processoId} />
          <input type="hidden" name="cteId" value={cte.id} />
          <input type="hidden" name="secao" value={ativa} />
          {ativa === "identificacao" ? <Identificacao rascunho={rascunho} emitente={cte.emitenteNome} /> : null}
          {ativa === "atores" ? <Atores rascunho={rascunho} /> : null}
          {ativa === "carga" ? <Carga rascunho={rascunho} /> : null}
          {ativa === "documentos" ? <Documentos rascunho={rascunho} /> : null}
          {ativa === "tributacao" ? <Tributacao rascunho={rascunho} /> : null}
          {ativa === "rodoviario" ? <Rodoviario rascunho={rascunho} /> : null}
          <div className="linha">
            <button className="btn" type="submit">Salvar seção</button>
          </div>
        </form>
      )}
      {ativa === "identificacao" ? (
        <form action={repreencherCteAction}>
          <input type="hidden" name="processoId" value={processoId} />
          <button className="btn secundario" type="submit">Preencher de novo com o processo</button>
        </form>
      ) : null}
    </section>
  );
}

function Identificacao({ rascunho, emitente }: { rascunho: ReturnType<typeof lerRascunho>; emitente: string | null }) {
  return (
    <>
      <p className="campo largo muted">Emitente: {emitente || "cadastro da conta WebmaniaBR (não vai no JSON)"}.</p>
      <Lista nome="finalidade" rotulo="Tipo do CT-e" valor={rascunho.finalidade} opcoes={TIPOS_CTE} />
      <Lista nome="tipoServico" rotulo="Tipo do serviço" valor={rascunho.tipoServico} opcoes={TIPOS_SERVICO} />
      <Lista nome="modal" rotulo="Modal" valor={rascunho.modal} opcoes={MODAIS} />
      <Lista nome="cfop" rotulo="CFOP" valor={rascunho.cfop || ""} opcoes={[{ id: "", rotulo: "Escolher" }, ...CFOPS]} />
      <Campo nome="naturezaOperacao" rotulo="Natureza da operação" valor={rascunho.naturezaOperacao} />
      <Lista nome="indicadorTomador" rotulo="Tomador" valor={rascunho.indicadorTomador} opcoes={TOMADORES} />
      <Lista nome="contribuicaoTomador" rotulo="Tipo de cliente do tomador" valor={rascunho.contribuicaoTomador} opcoes={CONTRIBUICOES} />
      <Campo nome="inicioCidade" rotulo="Cidade de início" valor={rascunho.inicioCidade} />
      <Uf nome="inicioUf" valor={rascunho.inicioUf || "GO"} rotulo="UF de início" />
      <Campo nome="fimCidade" rotulo="Cidade de término" valor={rascunho.fimCidade} />
      <Uf nome="fimUf" valor={rascunho.fimUf} rotulo="UF de término" />
      <Campo nome="valorServico" rotulo="Valor do serviço" valor={moeda(rascunho.valorServico)} />
      <Campo nome="valorReceber" rotulo="Valor a receber" valor={moeda(rascunho.valorReceber)} />
    </>
  );
}

function Atores({ rascunho }: { rascunho: ReturnType<typeof lerRascunho> }) {
  return (
    <>
      <Ator prefixo="remetente" titulo="Remetente" ator={rascunho.remetente} />
      <Ator prefixo="destinatario" titulo="Destinatário" ator={rascunho.destinatario} />
      <Ator prefixo="expedidor" titulo="Expedidor" ator={rascunho.expedidor} />
      <Ator prefixo="recebedor" titulo="Recebedor" ator={rascunho.recebedor} />
      <Ator prefixo="tomador" titulo="Tomador, se for Outro" ator={rascunho.tomador} />
    </>
  );
}

function Ator({ prefixo, titulo, ator }: { prefixo: string; titulo: string; ator: AtorCte | null }) {
  const pessoa = ator;
  return (
    <fieldset className="limpo campo largo">
      <legend>{titulo}</legend>
      <div className="grade-form">
        <Campo nome={`${prefixo}Nome`} rotulo="Nome" valor={pessoa?.nome} />
        <Campo nome={`${prefixo}Documento`} rotulo="CPF ou CNPJ" valor={pessoa?.documento} />
        <Campo nome={`${prefixo}Ie`} rotulo="Inscrição estadual" valor={pessoa?.ie} />
        <Campo nome={`${prefixo}Telefone`} rotulo="Telefone" valor={pessoa?.telefone} />
        <Campo nome={`${prefixo}Email`} rotulo="E-mail" valor={pessoa?.email} />
        <Campo nome={`${prefixo}Cep`} rotulo="CEP" valor={pessoa?.cep} />
        <Campo nome={`${prefixo}Endereco`} rotulo="Rua" valor={pessoa?.endereco} />
        <Campo nome={`${prefixo}Numero`} rotulo="Número" valor={pessoa?.numero} />
        <Campo nome={`${prefixo}Complemento`} rotulo="Complemento" valor={pessoa?.complemento} />
        <Campo nome={`${prefixo}Bairro`} rotulo="Bairro" valor={pessoa?.bairro} />
        <Campo nome={`${prefixo}Cidade`} rotulo="Cidade" valor={pessoa?.cidade} />
        <Uf nome={`${prefixo}Uf`} valor={pessoa?.uf || (prefixo === "remetente" ? "GO" : "")} rotulo="UF" />
      </div>
    </fieldset>
  );
}

function Carga({ rascunho }: { rascunho: ReturnType<typeof lerRascunho> }) {
  return (
    <>
      <Campo nome="produtoPredominante" rotulo="Produto predominante" valor={rascunho.produtoPredominante} />
      <Campo nome="valorMercadoria" rotulo="Valor da mercadoria" valor={moeda(rascunho.valorMercadoria)} />
      <Campo nome="cubagemM3" rotulo="Cubagem (m³)" valor={rascunho.cubagemM3 == null ? "" : String(rascunho.cubagemM3).replace(".", ",")} />
      <Campo nome="caracteristicas" rotulo="Outras características" valor={rascunho.caracteristicas} />
      <Campo nome="rntrc" rotulo="RNTRC" valor={rascunho.rntrc} />
      <p className="campo largo muted">A cubagem vai como unidade M3 (0) e tipo CUBAGEM. Peso não é calculado a partir do m³.</p>
    </>
  );
}

function Documentos({ rascunho }: { rascunho: ReturnType<typeof lerRascunho> }) {
  const documento = rascunho.documentos[0];
  return (
    <>
      <Lista nome="docTipo" rotulo="Tipo" valor={documento?.tipo ?? 3} opcoes={TIPOS_DOCUMENTO} />
      <Campo nome="docChave" rotulo="Chave da NF-e" valor={documento?.chave} />
      <Campo nome="docNumero" rotulo="Número ou declaração" valor={documento?.numero} />
      <label className="campo largo">
        <span>Observações gerais</span>
        <textarea name="observacoes" defaultValue={rascunho.observacoes || ""} />
      </label>
    </>
  );
}

function Tributacao({ rascunho }: { rascunho: ReturnType<typeof lerRascunho> }) {
  return (
    <>
      <Lista nome="situacaoIcms" rotulo="Situação tributária" valor={rascunho.situacaoIcms} opcoes={SITUACOES_ICMS} />
      <Lista nome="regime" rotulo="Regime" valor={rascunho.regime || ""} opcoes={[{ id: "", rotulo: "—" }, ...REGIMES]} />
      <Campo nome="reducaoBase" rotulo="% redução da base" valor={moeda(rascunho.reducaoBase)} />
      <Campo nome="baseIcms" rotulo="Base do ICMS" valor={moeda(rascunho.baseIcms)} />
      <Campo nome="aliquotaIcms" rotulo="Alíquota ICMS" valor={moeda(rascunho.aliquotaIcms)} />
      <Campo nome="valorIcms" rotulo="Valor do ICMS" valor={moeda(rascunho.valorIcms)} />
      <Campo nome="creditoIcms" rotulo="Crédito" valor={moeda(rascunho.creditoIcms)} />
      <Campo nome="beneficioFiscal" rotulo="Benefício fiscal" valor={rascunho.beneficioFiscal} />
      <label className="check">
        <input type="checkbox" name="partilhaIcms" defaultChecked={rascunho.partilhaIcms} /> Partilha de ICMS
      </label>
      <Lista nome="ibsSituacao" rotulo="CBS/IBS CST" valor={rascunho.ibsSituacao || ""} opcoes={[{ id: "", rotulo: "—" }, ...CST_IBS]} />
      <Campo nome="ibsClassificacao" rotulo="Classificação tributária" valor={rascunho.ibsClassificacao} />
      <Campo nome="ibsBase" rotulo="Base CBS/IBS" valor={moeda(rascunho.ibsBase)} />
      <Campo nome="ibsAliquotaEstadual" rotulo="Alíquota IBS estadual" valor={moeda(rascunho.ibsAliquotaEstadual)} />
      <Campo nome="ibsValorEstadual" rotulo="Valor IBS estadual" valor={moeda(rascunho.ibsValorEstadual)} />
      <Campo nome="ibsAliquotaMunicipal" rotulo="Alíquota IBS municipal" valor={moeda(rascunho.ibsAliquotaMunicipal)} />
      <Campo nome="ibsValorMunicipal" rotulo="Valor IBS municipal" valor={moeda(rascunho.ibsValorMunicipal)} />
      <Campo nome="cbsAliquota" rotulo="Alíquota CBS" valor={moeda(rascunho.cbsAliquota)} />
      <Campo nome="cbsValor" rotulo="Valor CBS" valor={moeda(rascunho.cbsValor)} />
    </>
  );
}

function Rodoviario({ rascunho }: { rascunho: ReturnType<typeof lerRascunho> }) {
  return (
    <>
      <Campo nome="rntrc" rotulo="RNTRC" valor={rascunho.rntrc} />
      <Campo nome="veiculo" rotulo="Veículo (placa)" valor={rascunho.veiculo} />
      <Campo nome="motorista" rotulo="Motorista" valor={rascunho.motorista} />
      <Campo nome="lacres" rotulo="Lacres, separados por vírgula" valor={rascunho.lacres.join(", ")} />
      <p className="campo largo muted">Placa, motorista e lacres ficam no CRM. No JSON da WebmaniaBR o grupo rodoviário leva o RNTRC.</p>
    </>
  );
}

function Acoes({
  cteId,
  processoId,
  chave,
  pendencias,
  dacte,
}: {
  cteId: string;
  processoId: string;
  chave: string | null;
  pendencias: string[];
  dacte: string | null;
}) {
  return (
    <div className="grade-form">
      {pendencias.length > 0 ? (
        <ul className="campo largo">
          {pendencias.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="campo largo muted">O pedido está completo para a montagem do JSON.</p>
      )}
      <form action={emitirCteAction}>
        <input type="hidden" name="processoId" value={processoId} />
        <button className="btn" type="submit">Emitir</button>
      </form>
      {dacte && chave ? (
        <a className="btn secundario" href={dacte}>Imprimir DACTE</a>
      ) : (
        <p className="muted">O DACTE aparece depois da autorização.</p>
      )}
      <form action={cancelarCteAction} className="campo">
        <input type="hidden" name="processoId" value={processoId} />
        <input type="hidden" name="cteId" value={cteId} />
        <span>Cancelar</span>
        <input name="justificativa" placeholder="Justificativa com pelo menos 15 caracteres" />
        <button className="btn secundario" type="submit">Preparar cancelamento</button>
      </form>
      <form action={corrigirCteAction} className="campo">
        <input type="hidden" name="processoId" value={processoId} />
        <input type="hidden" name="cteId" value={cteId} />
        <span>Carta de correção</span>
        <input name="grupo" placeholder="Grupo, ex. rem" />
        <input name="campo" placeholder="Campo, ex. xFant" />
        <input name="valor" placeholder="Valor corrigido" />
        <button className="btn secundario" type="submit">Preparar carta</button>
      </form>
      <form action={duplicarCteAction}>
        <input type="hidden" name="processoId" value={processoId} />
        <input type="hidden" name="cteId" value={cteId} />
        <button className="btn secundario" type="submit">Duplicar</button>
      </form>
      <p className="campo largo muted">Insucesso na entrega ainda não tem rota mapeada na API.</p>
      <form action={criarMdfeAction}>
        <input type="hidden" name="processoId" value={processoId} />
        <button className="btn secundario" type="submit">Abrir MDF-e desta viagem</button>
      </form>
    </div>
  );
}

function Campo({ nome, rotulo, valor }: { nome: string; rotulo: string; valor?: string | null }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <input name={nome} defaultValue={valor || ""} />
    </label>
  );
}

function Uf({ nome, rotulo, valor }: { nome: string; rotulo: string; valor?: string | null }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <select name={nome} defaultValue={valor || ""}>
        <option value="">—</option>
        {UFS.map((uf) => (
          <option key={uf}>{uf}</option>
        ))}
      </select>
    </label>
  );
}

function Lista({
  nome,
  rotulo,
  valor,
  opcoes,
}: {
  nome: string;
  rotulo: string;
  valor: string | number;
  opcoes: readonly { id: string | number; rotulo: string }[];
}) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <select name={nome} defaultValue={String(valor)}>
        {opcoes.map((opcao) => (
          <option key={opcao.id} value={opcao.id}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
