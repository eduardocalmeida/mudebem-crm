import { BarraLateral } from "@/components/barra";
import { exigirUsuario } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  return (
    <div className="shell">
      <BarraLateral usuario={usuario} />
      <div className="conteudo">{children}</div>
    </div>
  );
}
