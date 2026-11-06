import { headers } from "next/headers";
import { FormChave, FormRevogarChave } from "@/components/formularios";
import { SeloExemplo } from "@/components/selos";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { salvarEmpresaAction } from "@/server/actions-empresa";
import { obterEmpresa } from "@/server/empresa";
import { exigirUsuario } from "@/server/session";
import { alternarNumeroWhatsapp, sincronizarHistoricoWhatsapp } from "@/server/acoes-whatsapp";
import { FormAcao } from "@/components/form-acao";
import { mascararId, rotuloSituacao, situacaoChaves, situacaoSmtp, situacaoWebmania, situacaoWhatsapp } from "@/server/conexoes";

export const metadata = { title: "Conexões e APIs" };

function presente(nome: string) {
  return Boolean(process.env[nome]?.trim());
}

export default async function IntegracoesPage() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return <p className="alerta">Só um administrador vê conexões e APIs.</p>;
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") || cabecalhos.get("host") || "";
  const protocolo = cabecalhos.get("x-forwarded-proto") || "https";
  const base = host ? `${protocolo}://${host}` : "";
  const [empresa, chaves, configWhatsapp, numeros] = await Promise.all([
    obterEmpresa(),
    prisma.chaveApi.findMany({ orderBy: { criadaEm: "desc" }, include: { criadaPor: { select: { nome: true } } } }),
    prisma.configWhatsapp.findUnique({ where: { id: "padrao" } }),
    prisma.numeroWhatsapp.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const correio = situacaoSmtp({
    host: presente("SMTP_HOST") || presente("SMTP_URL"),
    senha: presente("SMTP_PASS") || presente("SMTP_PASSWORD"),
  });
  const tokenWebmania = presente("WEBMANIA_ACCESS_TOKEN");
  const webmania = situacaoWebmania({ token: tokenWebmania, producao: process.env.WEBMANIA_AMBIENTE?.trim() === "1" });
  const tokenWhatsapp = presente("WHATSAPP_ACCESS_TOKEN") || Boolean(configWhatsapp?.accessToken?.trim());
  const numerosReais = numeros.filter((numero) => numero.phoneNumberId.trim());
  const whatsapp = situacaoWhatsapp({ numeros: numerosReais.length, token: tokenWhatsapp });
  const chavesAtivas = chaves.filter((chave) => !chave.revogadaEm);
  const apis = situacaoChaves(chavesAtivas.length);

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Configuração</p>
          <h1>Conexões e APIs</h1>
          <p className="muted">O status vem do que já está no ambiente ou no banco. Esta tela não grava senha nem token.</p>
        </div>
      </header>
      <section className="conexoes">
        <article className="cartao bloco">
          <header className="linha">
            <h2>E-mail SMTP</h2>
            <span className={`selo-status ${correio.situacao}`}>{rotuloSituacao(correio.situacao)}</span>
          </header>
          <p>{correio.detalhe}</p>
          <p className="muted">A fila do portal marca o envio como sem SMTP enquanto o servidor não existe.</p>
          <button className="btn secundario" type="button" disabled>Configurar</button>
          <p className="muted">Peça ao Eduardo para definir o servidor no ambiente. A senha não será salva por aqui.</p>
        </article>

        <article className="cartao bloco">
          <header className="linha">
            <h2>WhatsApp Meta</h2>
            <span className={`selo-status ${whatsapp.situacao}`}>{rotuloSituacao(whatsapp.situacao)}</span>
          </header>
          <p>{whatsapp.detalhe}</p>
          <p className="muted">
            Verify token: {presente("WHATSAPP_VERIFY_TOKEN") || configWhatsapp?.verifyToken ? "definido" : "ausente"}.
            App secret: {presente("WHATSAPP_APP_SECRET") || configWhatsapp?.appSecret ? "definido" : "ausente"}.
            Token: {tokenWhatsapp ? "definido" : "ausente"}.
          </p>
          <ul className="lista-simples">
            {numeros.length === 0 ? <li className="muted">Nenhum número cadastrado.</li> : null}
            {numeros.map((numero) => (
              <li key={numero.id} className="item-lista">
                <span>
                  <strong>{numero.nome}</strong> {numero.exemplo ? <SeloExemplo /> : null}
                  <br />
                  <span className="muted">
                    {numero.numeroExibicao} · id {mascararId(numero.phoneNumberId)}
                    {numero.ativo ? " · ativo" : " · desativado"}
                    {numero.coexistencia ? " · coexistência" : ""}
                    {numero.historicoStatus ? ` · histórico ${numero.historicoStatus}` : ""}
                  </span>
                </span>
                <span className="linha">
                  {numero.coexistencia && numero.historicoStatus !== "concluido" && numero.historicoStatus !== "recusado" ? (
                    <FormAcao acao={sincronizarHistoricoWhatsapp}>
                      <input type="hidden" name="numeroId" value={numero.id} />
                      <button className="btn secundario" type="submit">Pedir histórico</button>
                    </FormAcao>
                  ) : null}
                  <FormAcao acao={alternarNumeroWhatsapp}>
                    <input type="hidden" name="numeroId" value={numero.id} />
                    <button className="btn secundario" type="submit">{numero.ativo ? "Desativar" : "Reativar"}</button>
                  </FormAcao>
                </span>
              </li>
            ))}
          </ul>
          <button className="btn secundario" type="button" disabled>Configurar credenciais</button>
          <p className="muted">O cadastro de token fica para uma próxima etapa. Nada de segredo é gravado nesta tela.</p>
        </article>

        <article className="cartao bloco">
          <header className="linha">
            <h2>Webmania fiscal</h2>
            <span className={`selo-status ${webmania.situacao}`}>{rotuloSituacao(webmania.situacao)}</span>
          </header>
          <p>{webmania.detalhe}</p>
          <p className="muted">Cobre CT-e, MDF-e e NFS-e. O certificado A1 continua no painel da Webmania. Token: {tokenWebmania ? "definido" : "ausente"}.</p>
          <button className="btn secundario" type="button" disabled>Configurar</button>
        </article>

        <article className="cartao bloco">
          <header className="linha">
            <h2>Chaves de API</h2>
            <span className={`selo-status ${apis.situacao}`}>{rotuloSituacao(apis.situacao)}</span>
          </header>
          <p>{apis.detalhe}</p>
          <FormChave />
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Prefixo</th>
                  <th>Uso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {chaves.length === 0 ? <tr><td colSpan={4}>Nenhuma chave.</td></tr> : null}
                {chaves.map((chave) => (
                  <tr key={chave.id}>
                    <td>
                      <strong>{chave.nome}</strong> {chave.exemplo ? <SeloExemplo /> : null}
                      <div className="muted">por {chave.criadaPor.nome}</div>
                    </td>
                    <td><code>{chave.prefixo}••••</code></td>
                    <td>
                      {chave.revogadaEm ? `Revogada em ${formatarDataHora(chave.revogadaEm)}` : "Ativa"}
                      <div className="muted">{chave.ultimoUsoEm ? `último uso ${formatarDataHora(chave.ultimoUsoEm)}` : "ainda sem uso"}</div>
                    </td>
                    <td>{chave.revogadaEm ? null : <FormRevogarChave chaveId={chave.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="cartao bloco">
          <header className="linha">
            <h2>Formulário do site</h2>
            <span className="selo-status conectado">Conectado</span>
          </header>
          <p>A página pública e o script de incorporação já fazem parte do aplicativo.</p>
          <p><a href="/orcamento">{base}/orcamento</a></p>
          <pre className="chave-nova">{`<div id="mudebem-orcamento"></div>\n<script src="${base}/formulario.js" async></script>`}</pre>
        </article>
      </section>

      <section className="cartao bloco">
        <h2>Empresa emitente</h2>
        <p className="muted">Usada na NFS-e. A sede padrão é Goiânia/GO, IBGE 5208707. Não é uma credencial de API.</p>
        <form action={salvarEmpresaAction} className="grade-form">
          <label className="campo"><span>Nome</span><input name="nome" defaultValue={empresa.nome || ""} /></label>
          <label className="campo"><span>CNPJ</span><input name="cnpj" defaultValue={empresa.cnpj || ""} /></label>
          <label className="campo"><span>Inscrição estadual</span><input name="ie" defaultValue={empresa.ie || ""} /></label>
          <label className="campo"><span>Município</span><input name="municipio" defaultValue={empresa.municipio} /></label>
          <label className="campo"><span>UF</span><input name="uf" defaultValue={empresa.uf} /></label>
          <label className="campo"><span>Código IBGE</span><input name="codigoIbge" defaultValue={empresa.codigoIbge} /></label>
          <button className="btn" type="submit">Salvar empresa</button>
        </form>
      </section>
    </>
  );
}
