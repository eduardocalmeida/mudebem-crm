import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="conteudo">
      <p className="sobretitulo">404</p>
      <h1>Não encontramos esta página</h1>
      <p className="muted">O processo ou o cadastro pode ter sido removido.</p>
      <p>
        <Link className="btn primario" href="/painel">
          Voltar ao painel
        </Link>
      </p>
    </main>
  );
}
