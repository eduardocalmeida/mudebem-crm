import { FormAcao } from "@/components/form-acao";
import { Logo } from "@/components/logo";
import { entrarAction } from "@/server/actions";

export const metadata = { title: "Entrar" };

const DEMONSTRACAO = [
  ["Ana Costa", "ana.costa@mudebem.com.br", "Administrador"],
  ["Bruno Lima", "bruno.lima@mudebem.com.br", "Comercial"],
  ["Carla Nunes", "carla.nunes@mudebem.com.br", "Operação"],
  ["Diego Ramos", "diego.ramos@mudebem.com.br", "Financeiro"],
];

export default function LoginPage() {
  return (
    <main className="login">
      <section className="login-hero">
        <div>
          <p className="sobretitulo">Mude Bem Mudanças e Logística</p>
          <h1>Cada mudança, do primeiro contato ao recebimento.</h1>
        </div>
        <p>
          Cotação, proposta, contrato, coleta, CT-e e fatura no mesmo processo. O time comercial, a operação e o
          financeiro enxergam a mesma pipeline.
        </p>
      </section>
      <section className="login-painel">
        <div className="login-cartao">
          <Logo />
          <p className="sobretitulo">Acesso</p>
          <h2>Entrar no CRM</h2>
          <FormAcao acao={entrarAction}>
            <label className="campo">
              <span>E-mail</span>
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label className="campo">
              <span>Senha</span>
              <input name="senha" type="password" autoComplete="current-password" required />
            </label>
            <button className="btn primario" type="submit">
              Entrar
            </button>
          </FormAcao>
          {process.env.NODE_ENV !== "production" ? (
            <div className="demo">
              <strong>Acesso de demonstração</strong>
              <p>Senha de todos: MudeBem@2026</p>
              <ul>
                {DEMONSTRACAO.map(([nome, email, papel]) => (
                  <li key={email}>
                    {nome} · {papel}
                    <br />
                    <code>{email}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
