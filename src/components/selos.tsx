import { etapaPorId, rotuloCanal, type Canal, type Etapa } from "@/lib/domain";

export function SeloEtapa({ etapa }: { etapa: Etapa }) {
  const meta = etapaPorId(etapa);
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
