"use client";

import { useState } from "react";
import { interpretarVencimento } from "@/lib/format";

export function CampoVencimento({ valor = "", obrigatorio = false }: { valor?: string; obrigatorio?: boolean }) {
  const [campo, setCampo] = useState(valor);
  const instante = interpretarVencimento(campo);

  function abrir(alvo: HTMLInputElement) {
    const mostrar = (alvo as HTMLInputElement & { showPicker?: () => void }).showPicker;
    if (typeof mostrar !== "function") return;
    try {
      mostrar.call(alvo);
    } catch {
      alvo.focus();
    }
  }

  return (
    <label className="campo campo-vencimento">
      <span>Vencimento</span>
      <input
        type="datetime-local"
        required={obrigatorio}
        value={campo}
        aria-label="Vencimento, data e hora"
        onChange={(evento) => setCampo(evento.target.value)}
        onClick={(evento) => abrir(evento.currentTarget)}
      />
      <input type="hidden" name="vencimento" value={instante ? instante.toISOString() : ""} />
    </label>
  );
}
