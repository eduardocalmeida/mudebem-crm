"use client";

import { useState } from "react";
import { salvarValorInventarioAction } from "@/server/actions-operacao";

export function ValorInventario({ processoId, chave, valor, nome }: { processoId: string; chave: string; valor: number | null; nome: string }) {
  const inicial = valor == null ? "" : valor.toFixed(2).replace(".", ",");
  const [texto, setTexto] = useState(inicial);
  return (
    <input
      className="valor-linha"
      inputMode="decimal"
      aria-label={`Valor declarado de ${nome} em reais`}
      value={texto}
      placeholder="0,00"
      onChange={(evento) => setTexto(evento.target.value)}
      onBlur={() => {
        if (texto.trim() !== inicial) void salvarValorInventarioAction(processoId, chave, texto);
      }}
    />
  );
}
