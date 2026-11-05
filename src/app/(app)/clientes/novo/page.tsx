import { FormCliente } from "@/components/formularios";
import { podeGerirClientes } from "@/lib/domain";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage() {
  const usuario = await exigirUsuario();
  if (!podeGerirClientes(usuario.papel)) {
    return <p className="alerta">Seu papel não cadastra clientes.</p>;
  }
  return (
    <>
      <p className="sobretitulo">Cadastros</p>
      <h1>Novo cliente</h1>
      <section className="cartao bloco">
        <FormCliente />
      </section>
    </>
  );
}
