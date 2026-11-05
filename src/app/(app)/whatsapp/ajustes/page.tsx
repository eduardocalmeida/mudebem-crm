import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { FormConfigWhatsapp, FormNumeroWhatsapp } from "@/components/whatsapp-forms";
import { SeloExemplo } from "@/components/selos";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";
import { alternarNumeroWhatsapp } from "@/server/acoes-whatsapp";
import { segredosWhatsapp, sincronizarNumerosDoAmbiente } from "@/server/whatsapp-config";

export const metadata = { title: "WhatsApp · ajustes" };

export default async function AjustesWhatsappPage() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return <p className="alerta">Só um administrador configura a conexão com a Meta.</p>;
  await sincronizarNumerosDoAmbiente();
  const [segredos, numeros] = await Promise.all([
    segredosWhatsapp(),
    prisma.numeroWhatsapp.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Meta</p>
          <h1>Números e conexão</h1>
          <p className="muted">Um app e um WABA, com um ou mais phone number ids. O webhook é /api/whatsapp/webhook.</p>
        </div>
        <Link className="btn secundario" href="/whatsapp">
          Voltar à inbox
        </Link>
      </header>
      <section className="cartao bloco">
        <h2>App da Meta</h2>
        <p className="muted">
          Verify token: {segredos.verifyToken ? "configurado" : "ausente"}. App secret: {segredos.appSecret ? "configurado" : "ausente"}. Token padrão:{" "}
          {segredos.accessToken ? "configurado" : "ausente"}.
        </p>
        <FormConfigWhatsapp
          wabaId={segredos.wabaId ?? ""}
          apiVersion={segredos.apiVersion}
          travado={{
            verifyToken: segredos.verifyTokenNoAmbiente,
            appSecret: segredos.appSecretNoAmbiente,
            accessToken: segredos.accessTokenNoAmbiente,
            waba: Boolean(process.env.WHATSAPP_WABA_ID?.trim()),
            versao: Boolean(process.env.WHATSAPP_API_VERSION?.trim()),
          }}
        />
      </section>
      <section className="ficha">
        <article className="cartao bloco">
          <h2>Novo número</h2>
          <FormNumeroWhatsapp />
        </article>
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Exibição</th>
                <th>Phone number id</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {numeros.length === 0 ? (
                <tr>
                  <td colSpan={4}>Nenhum número ainda. Cadastre dois para começar.</td>
                </tr>
              ) : null}
              {numeros.map((numero) => (
                <tr key={numero.id}>
                  <td>
                    <strong>{numero.nome}</strong> {numero.exemplo ? <SeloExemplo /> : null}
                    <div className="muted">{numero.ativo ? "Ativo" : "Desativado"} · token {numero.accessToken ? "próprio" : "padrão"}</div>
                  </td>
                  <td>{numero.numeroExibicao}</td>
                  <td><code>{numero.phoneNumberId}</code></td>
                  <td>
                    <FormAcao acao={alternarNumeroWhatsapp}>
                      <input type="hidden" name="numeroId" value={numero.id} />
                      <button className="btn secundario" type="submit">
                        {numero.ativo ? "Desativar" : "Reativar"}
                      </button>
                    </FormAcao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
