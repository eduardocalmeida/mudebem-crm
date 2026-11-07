"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { parametrosDe, type FiltroLista } from "@/lib/consulta";
import { formatarData } from "@/lib/format";

type EtapaOpcao = { slug: string; rotulo: string };
type Pessoa = { id: string; nome: string };

function dinheiroCampo(valor: number | undefined) {
  return valor == null ? "" : String(valor).replace(".", ",");
}

export function BarraFiltros({
  filtro,
  etapas,
  responsaveis,
}: {
  filtro: FiltroLista;
  etapas: EtapaOpcao[];
  responsaveis: Pessoa[];
}) {
  const [aberto, setAberto] = useState(false);
  const painel = useRef<HTMLDialogElement>(null);
  const abrir = useRef<HTMLButtonElement>(null);
  const tituloId = useId();
  const etapasAtivas = filtro.etapas ?? [];

  useEffect(() => {
    const dialog = painel.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  function fechar() {
    setAberto(false);
    abrir.current?.focus();
  }

  const chips = chipsDoFiltro(filtro, etapas, responsaveis);

  return (
    <div className="barra-filtro">
      <form id="filtros-oportunidades" className="barra-filtro-linha" method="get" action="/processos">
        <input type="hidden" name="visao" value={filtro.visao} />
        {filtro.canal ? <input type="hidden" name="canal" value={filtro.canal} /> : null}
        {filtro.clienteId ? <input type="hidden" name="clienteId" value={filtro.clienteId} /> : null}
        {filtro.etiqueta ? <input type="hidden" name="etiqueta" value={filtro.etiqueta} /> : null}
        <input name="q" defaultValue={filtro.q ?? ""} placeholder="Pesquisar código, cliente ou cidade" aria-label="Pesquisar oportunidades" />
        <button ref={abrir} type="button" className="btn secundario" aria-expanded={aberto} aria-controls="painel-filtros" onClick={() => setAberto(true)}>
          Pesquisar e filtrar
        </button>
        <button className="btn primario" type="submit">
          Buscar
        </button>
      </form>
      {chips.length > 0 ? (
        <div className="chips-filtro" aria-label="Filtros aplicados">
          {chips.map((chip) => (
            <Link key={chip.chave} className="chip" href={`/processos${chip.href}`}>
              {chip.rotulo} <span aria-hidden>×</span>
              <span className="so-leitor">Remover filtro {chip.rotulo}</span>
            </Link>
          ))}
          <Link className="btn secundario" href={`/processos?visao=${filtro.visao}`}>
            Limpar
          </Link>
        </div>
      ) : null}
      <dialog
        ref={painel}
        id="painel-filtros"
        className="painel-filtro"
        aria-labelledby={tituloId}
        onClose={fechar}
        onCancel={(evento) => {
          evento.preventDefault();
          fechar();
        }}
      >
        <div className="painel-filtro-corpo">
          <header>
            <h2 id={tituloId}>Pesquisar e filtrar</h2>
            <button type="button" className="btn secundario" onClick={fechar}>
              Fechar
            </button>
          </header>
          <fieldset>
            <legend>Etapas</legend>
            <div className="checks-etapa">
              {etapas.map((etapa) => (
                <label key={etapa.slug}>
                  <input type="checkbox" name="etapas" value={etapa.slug} form="filtros-oportunidades" defaultChecked={etapasAtivas.includes(etapa.slug)} />
                  {etapa.rotulo}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grade-form">
            <label className="campo">
              <span>Origem (cidade, UF ou endereço)</span>
              <input name="origem" form="filtros-oportunidades" defaultValue={filtro.origem ?? ""} placeholder="São Paulo" />
            </label>
            <label className="campo">
              <span>Destino (cidade, UF ou endereço)</span>
              <input name="destino" form="filtros-oportunidades" defaultValue={filtro.destino ?? ""} placeholder="Curitiba" />
            </label>
            <label className="campo">
              <span>Data de coleta, de</span>
              <input name="de" form="filtros-oportunidades" defaultValue={filtro.dataColetaDe ? formatarData(filtro.dataColetaDe) : ""} placeholder="dd/mm/aaaa" inputMode="numeric" />
            </label>
            <label className="campo">
              <span>Data de coleta, até</span>
              <input name="ate" form="filtros-oportunidades" defaultValue={filtro.dataColetaAte ? formatarData(filtro.dataColetaAte) : ""} placeholder="dd/mm/aaaa" inputMode="numeric" />
            </label>
            <label className="campo">
              <span>Resultado comercial</span>
              <select name="resultado" form="filtros-oportunidades" defaultValue={filtro.resultado ?? ""}>
                <option value="">Todos</option>
                <option value="ganho">Ganhos, inclusive registros antigos</option>
                <option value="perdido">Perdidos, inclusive registros antigos</option>
              </select>
            </label>
            <label className="campo">
              <span>Responsável</span>
              <select name="responsavelId" form="filtros-oportunidades" defaultValue={filtro.semResponsavel ? "nenhum" : filtro.responsavelId ?? ""}>
                <option value="">Todos</option>
                <option value="nenhum">Sem responsável</option>
                {responsaveis.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Frete mínimo (R$)</span>
              <input name="freteMin" form="filtros-oportunidades" defaultValue={dinheiroCampo(filtro.freteMin)} inputMode="decimal" />
            </label>
            <label className="campo">
              <span>Frete máximo (R$)</span>
              <input name="freteMax" form="filtros-oportunidades" defaultValue={dinheiroCampo(filtro.freteMax)} inputMode="decimal" />
            </label>
            <label className="campo">
              <span>Seguro mínimo (R$)</span>
              <input name="seguroMin" form="filtros-oportunidades" defaultValue={dinheiroCampo(filtro.seguroMin)} inputMode="decimal" />
            </label>
            <label className="campo">
              <span>Seguro máximo (R$)</span>
              <input name="seguroMax" form="filtros-oportunidades" defaultValue={dinheiroCampo(filtro.seguroMax)} inputMode="decimal" />
            </label>
            <label className="campo">
              <span>Valor total mínimo (R$)</span>
              <input name="totalMin" form="filtros-oportunidades" defaultValue={dinheiroCampo(filtro.totalMin)} inputMode="decimal" />
            </label>
            <label className="campo">
              <span>Valor total máximo (R$)</span>
              <input name="totalMax" form="filtros-oportunidades" defaultValue={dinheiroCampo(filtro.totalMax)} inputMode="decimal" />
            </label>
          </div>
          <div className="linha">
            <button className="btn primario" type="submit" form="filtros-oportunidades">
              Aplicar
            </button>
            <Link className="btn secundario" href={`/processos?visao=${filtro.visao}`} onClick={fechar}>
              Limpar
            </Link>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function sem(filtro: FiltroLista, parcial: Partial<FiltroLista>) {
  return parametrosDe({ ...filtro, ...parcial, pagina: undefined });
}

function chipsDoFiltro(filtro: FiltroLista, etapas: EtapaOpcao[], responsaveis: Pessoa[]) {
  const chips: { chave: string; rotulo: string; href: string }[] = [];
  if (filtro.q) chips.push({ chave: "q", rotulo: `Busca: ${filtro.q}`, href: sem(filtro, { q: undefined }) });
  for (const slug of filtro.etapas ?? []) {
    const rotulo = etapas.find((etapa) => etapa.slug === slug)?.rotulo ?? slug;
    chips.push({
      chave: `etapa-${slug}`,
      rotulo,
      href: sem(filtro, { etapas: (filtro.etapas ?? []).filter((item) => item !== slug), etapa: undefined }),
    });
  }
  if (filtro.origem) chips.push({ chave: "origem", rotulo: `Origem: ${filtro.origem}`, href: sem(filtro, { origem: undefined }) });
  if (filtro.destino) chips.push({ chave: "destino", rotulo: `Destino: ${filtro.destino}`, href: sem(filtro, { destino: undefined }) });
  if (filtro.dataColetaDe) chips.push({ chave: "de", rotulo: `Coleta de ${formatarData(filtro.dataColetaDe)}`, href: sem(filtro, { dataColetaDe: undefined }) });
  if (filtro.dataColetaAte) chips.push({ chave: "ate", rotulo: `Coleta até ${formatarData(filtro.dataColetaAte)}`, href: sem(filtro, { dataColetaAte: undefined }) });
  if (filtro.semResponsavel) chips.push({ chave: "resp", rotulo: "Sem responsável", href: sem(filtro, { semResponsavel: false, responsavelId: undefined }) });
  else if (filtro.responsavelId) {
    const nome = responsaveis.find((pessoa) => pessoa.id === filtro.responsavelId)?.nome ?? "Responsável";
    chips.push({ chave: "resp", rotulo: nome, href: sem(filtro, { responsavelId: undefined }) });
  }
  const faixa = (chave: string, rotulo: string, min?: number, max?: number, limpar?: Partial<FiltroLista>) => {
    if (min == null && max == null) return;
    const texto = min != null && max != null ? `${rotulo} ${min}–${max}` : min != null ? `${rotulo} ≥ ${min}` : `${rotulo} ≤ ${max}`;
    chips.push({ chave, rotulo: texto, href: sem(filtro, limpar ?? {}) });
  };
  faixa("frete", "Frete", filtro.freteMin, filtro.freteMax, { freteMin: undefined, freteMax: undefined });
  faixa("seguro", "Seguro", filtro.seguroMin, filtro.seguroMax, { seguroMin: undefined, seguroMax: undefined });
  faixa("total", "Total", filtro.totalMin, filtro.totalMax, { totalMin: undefined, totalMax: undefined });
  if (filtro.canal) chips.push({ chave: "canal", rotulo: filtro.canal, href: sem(filtro, { canal: undefined }) });
  if (filtro.etiqueta) chips.push({ chave: "etiqueta", rotulo: filtro.etiqueta, href: sem(filtro, { etiqueta: undefined }) });
  if (filtro.resultado) chips.push({ chave: "resultado", rotulo: filtro.resultado === "ganho" ? "Ganhos" : "Perdidos", href: sem(filtro, { resultado: undefined }) });
  return chips;
}
