"use client";

import { MOTIVOS_PERDA } from "@/lib/resultado-comercial";
import { marcarPerdidoAction, salvarPosVendaAction } from "@/server/actions";
import { FormAcao } from "@/components/form-acao";

export function MarcarPerdido({ processoId }: { processoId: string }) {
  return (
    <FormAcao acao={marcarPerdidoAction} className="perda-compacta">
      <input type="hidden" name="processoId" value={processoId} />
      <label className="campo">
        <span>Marcar como perdido</span>
        <select name="motivoPerda" required defaultValue="">
          <option value="" disabled>
            Motivo obrigatório
          </option>
          {MOTIVOS_PERDA.map((motivo) => (
            <option key={motivo.id} value={motivo.id}>
              {motivo.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Detalhe</span>
        <input name="detalhe" placeholder="Obrigatório se o motivo for Outro" />
      </label>
      <button className="btn secundario" type="submit">
        Registrar perda
      </button>
    </FormAcao>
  );
}

export function FormPosVenda({ processoId, nota, comentario }: { processoId: string; nota: number | null; comentario: string | null }) {
  return (
    <FormAcao acao={salvarPosVendaAction} className="grade-form">
      <input type="hidden" name="processoId" value={processoId} />
      <label className="campo">
        <span>Satisfação, de 0 a 10</span>
        <input name="nota" inputMode="numeric" min={0} max={10} defaultValue={nota ?? ""} placeholder="Opcional" />
      </label>
      <label className="campo largo">
        <span>Comentário</span>
        <textarea name="comentario" defaultValue={comentario ?? ""} placeholder="Opcional. Não envia pesquisa." />
      </label>
      <button className="btn secundario" type="submit">
        Registrar pós-venda
      </button>
    </FormAcao>
  );
}
