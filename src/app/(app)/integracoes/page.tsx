import { headers } from "next/headers";
import { FormChave, FormRevogarChave } from "@/components/formularios";
import { SeloExemplo } from "@/components/selos";
import { CHAVE_API_EXEMPLO } from "@/lib/api-key";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Integrações" };

export default async function IntegracoesPage() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return <p className="alerta">Só um administrador gerencia chaves de API.</p>;
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") || cabecalhos.get("host") || "";
  const protocolo = cabecalhos.get("x-forwarded-proto") || "https";
  const base = host ? `${protocolo}://${host}` : "";
  const chaves = await prisma.chaveApi.findMany({
    orderBy: { criadaEm: "desc" },
    include: { criadaPor: { select: { nome: true } } },
  });

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Agentes</p>
          <h1>Integrações</h1>
          <p className="muted">Chaves para criar processos, atualizar campos, lançar notas e mover etapas.</p>
        </div>
      </header>
      {process.env.NODE_ENV !== "production" ? (
        <p className="faixa-exemplo">
          Chave de demonstração do seed, só neste ambiente: <code className="chave">{CHAVE_API_EXEMPLO}</code>
        </p>
      ) : null}
      <section className="cartao bloco">
        <h2>Formulário do site</h2>
        <p className="muted">Página pública e script para incorporar no site novo. O envio abre o lead em Leads de entrada.</p>
        <p>
          <a href="/orcamento">{base}/orcamento</a>
        </p>
        <pre className="chave-nova">{`<div id="mudebem-orcamento"></div>\n<script src="${base}/formulario.js" async></script>`}</pre>
      </section>
      <section className="cartao bloco">
        <h2>WebmaniaBR</h2>
        <p className="muted">
          CT-e e MDF-e usam a API v2 em homologação quando <code>WEBMANIA_AMBIENTE=2</code>. O certificado A1 é enviado no painel da WebmaniaBR, na empresa emitente. Aqui só entra o token de acesso, por variável de ambiente.
        </p>
      </section>
      <section className="ficha">
        <article className="cartao bloco">
          <h2>Nova chave</h2>
          <FormChave />
        </article>
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
              {chaves.map((chave) => (
                <tr key={chave.id}>
                  <td>
                    <strong>{chave.nome}</strong> {chave.exemplo ? <SeloExemplo /> : null}
                    <div className="muted">por {chave.criadaPor.nome}</div>
                  </td>
                  <td>
                    <code>{chave.prefixo}…</code>
                  </td>
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
      </section>
    </>
  );
}
