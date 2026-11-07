import { etapaPorId, rotuloCanal, type Canal } from "@/lib/domain";
import { carregarEtapas } from "@/server/etapas";

export async function SeloEtapa({ etapa }: { etapa: string }) {
  const meta = etapaPorId(etapa, await carregarEtapas());
  return (
    <span className="selo" style={{ color: meta.cor, borderColor: meta.cor }}>
      {meta.rotulo}
    </span>
  );
}

export function SeloCanal({ canal }: { canal: Canal }) {
  return <span className="selo">{rotuloCanal(canal)}</span>;
}

export function SeloExemplo() {
  return <span className="selo exemplo">Exemplo</span>;
}
