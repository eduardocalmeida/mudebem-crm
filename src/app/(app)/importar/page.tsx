import { FormAcao } from "@/components/form-acao";
import { importarCsvAction } from "@/server/acoes-cadastro";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Importar Kommo" };

export default async function ImportarPage() {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "ADMIN") return <p className="alerta">Só um administrador importa a base da Kommo.</p>;

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Migração</p>
          <h1>Importar CSV da Kommo</h1>
          <p className="muted">
            Exporte leads, contatos e empresas na Kommo e envie o CSV aqui. A importação reconhece as colunas das oportunidades
            (cidade, andar, modalidade, valores, motorista, UTM) e guarda o que não mapeou como campo personalizado.
            Rodar de novo o mesmo arquivo atualiza pelo ID da Kommo.
          </p>
        </div>
      </header>
      <section className="cartao bloco">
        <FormAcao acao={importarCsvAction}>
          <label className="campo">
            <span>Tipo de planilha</span>
            <select name="tipo" defaultValue="leads">
              <option value="leads">Leads / processos</option>
              <option value="contatos">Contatos</option>
              <option value="empresas">Empresas</option>
            </select>
          </label>
          <label className="campo">
            <span>Arquivo CSV</span>
            <input name="arquivo" type="file" accept=".csv,text/csv" required />
          </label>
          <button className="btn primario" type="submit">
            Importar
          </button>
        </FormAcao>
      </section>
    </>
  );
}
