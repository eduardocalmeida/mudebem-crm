import { BarraLateral } from "@/components/barra";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const naoLidas = await prisma.conversa.count({ where: { naoLida: true, status: { not: "FECHADA" } } });
  return (
    <div className="shell">
      <BarraLateral usuario={usuario} naoLidas={naoLidas} />
      <div className="conteudo">{children}</div>
    </div>
  );
}
