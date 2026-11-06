import Link from "next/link";
import { FormProcesso } from "@/components/formularios";
import { camposDoPapel, podeCriarProcesso } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";

export const metadata = { title: "Nova oportunidade" };

export default async function NovoProcessoPage() {
  const usuario = await exigirUsuario();
  if (!podeCriarProcesso(usuario.papel)) {
    return (
      <>
        <h1>Nova oportunidade</h1>
        <p className="alerta">Seu papel acompanha a operação, mas a abertura de oportunidades fica com o comercial.</p>
      </>
    );
  }
  const [clientes, usuarios] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      include: { contatos: { orderBy: { nome: "asc" }, select: { id: true, nome: true } } },
    }),
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Comercial</p>
          <h1>Nova oportunidade</h1>
          <p className="muted">A entrada fica em Cotação recebida. O código MB é gerado automaticamente.</p>
        </div>
        <Link className="btn secundario" href="/clientes/novo">
          Novo cliente
        </Link>
      </header>
      {clientes.length === 0 ? (
        <p className="alerta">
          Cadastre um cliente antes de abrir o processo. <Link href="/clientes/novo">Criar cliente</Link>
        </p>
      ) : (
        <section className="cartao bloco">
          <FormProcesso
            modo="criar"
            campos={camposDoPapel(usuario.papel)}
            clientes={clientes}
            usuarios={usuarios}
            valores={{ responsavelId: usuario.id, canal: "EMAIL" }}
          />
        </section>
      )}
    </>
  );
}
