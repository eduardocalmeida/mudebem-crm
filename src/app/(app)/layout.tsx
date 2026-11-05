import { BarraLateral } from "@/components/barra";
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const naoLidas = await prisma.conversaWhatsapp.count({ where: { naoLida: true } });
  return (
    <div className="shell">
      <BarraLateral usuario={usuario} naoLidas={naoLidas} />
      <div className="conteudo">{children}</div>
    </div>
  );
}
