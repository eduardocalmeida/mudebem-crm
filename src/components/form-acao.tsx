"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { EstadoForm } from "@/lib/estado";

type Acao = (estado: EstadoForm, dados: FormData) => Promise<EstadoForm>;

export function FormAcao({
  acao,
  children,
  className,
}: {
  acao: Acao;
  children: React.ReactNode;
  className?: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const router = useRouter();
  useEffect(() => {
    if (estado.ok || estado.chave) router.refresh();
  }, [estado.ok, estado.chave, router]);
  return (
    <form action={enviar} className={className}>
      {estado.erro ? (
        <p className="alerta" role="alert">
          {estado.erro}
        </p>
      ) : null}
      {estado.chave ? (
        <p className="chave-nova">
          Copie a chave agora. Ela não será mostrada de novo.
          <br />
          <code>{estado.chave}</code>
        </p>
      ) : estado.ok ? (
        <p className="ok" role="status">
          {estado.ok}
        </p>
      ) : null}
      <fieldset className="limpo" disabled={pendente}>
        {children}
      </fieldset>
    </form>
  );
}
