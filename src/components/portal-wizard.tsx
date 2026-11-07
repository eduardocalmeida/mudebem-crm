"use client";

import { useMemo, useState } from "react";
import { enviarSolicitacaoAction } from "@/server/actions-portal";

type Item = { id: string; nome: string; categoria: string; volumeM3: number };
type Unidade = { id: string; nome: string };

export function PortalWizard({ slug, email, unidades, catalogo }: { slug: string; email: string; unidades: Unidade[]; catalogo: Item[] }) {
  const [passo, setPasso] = useState(1);
  const [dados, setDados] = useState({ nome: "", cpf: "", email, telefone: "", unidadeId: unidades[0]?.id || "", dataPrevista: "" });
  const [origem, setOrigem] = useState({ cep: "", endereco: "", cidade: "", uf: "" });
  const [destino, setDestino] = useState({ cep: "", endereco: "", cidade: "", uf: "" });
  const [km, setKm] = useState("1000");
  const [declarado, setDeclarado] = useState("50000");
  const [qtd, setQtd] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState(catalogo[0]?.categoria || "");
  const [erro, setErro] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const categorias = [...new Set(catalogo.map((item) => item.categoria))];
  const escolhidos = catalogo.filter((item) => (qtd[item.id] || 0) > 0);
  const volume = escolhidos.reduce((soma, item) => soma + item.volumeM3 * qtd[item.id], 0);
  const visiveis = useMemo(
    () => catalogo.filter((item) => item.categoria === categoria && item.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))),
    [catalogo, categoria, busca],
  );

  async function cep(qual: "origem" | "destino") {
    const atual = qual === "origem" ? origem : destino;
    const resposta = await fetch(`/api/publico/cep?cep=${atual.cep}`);
    const json = (await resposta.json()) as { endereco?: string; cidade?: string; uf?: string; erro?: string };
    if (!resposta.ok) return setErro(json.erro || "CEP não encontrado.");
    const proximo = { ...atual, endereco: json.endereco || atual.endereco, cidade: json.cidade || "", uf: json.uf || "" };
    if (qual === "origem") setOrigem(proximo);
    else setDestino(proximo);
  }

  async function enviar() {
    setErro("");
    const resultado = await enviarSolicitacaoAction({
      slug,
      ...dados,
      origemEndereco: origem.endereco,
      origemCep: origem.cep,
      origemCidade: origem.cidade,
      origemUf: origem.uf,
      destinoEndereco: destino.endereco,
      destinoCep: destino.cep,
      destinoCidade: destino.cidade,
      destinoUf: destino.uf,
      distanciaKm: Number(km.replace(",", ".")),
      valorDeclarado: Number(declarado.replace(/\./g, "").replace(",", ".")),
      itens: escolhidos.map((item) => ({ catalogoId: item.id, nome: item.nome, comodo: "SALA", quantidade: qtd[item.id], volumeM3: item.volumeM3 })),
    });
    if ("erro" in resultado && resultado.erro) return setErro(resultado.erro);
    if ("protocolo" in resultado) setProtocolo(`${resultado.protocolo}${resultado.semFaixa ? " · sem faixa contratual – análise administrativa" : ` · R$ ${resultado.total}`}`);
  }

  if (protocolo) {
    return (
      <section className="portal-card">
        <h1>Solicitação enviada</h1>
        <p>{protocolo}</p>
      </section>
    );
  }

  return (
    <section className="portal-card">
      <p className="sobretitulo">0{passo}</p>
      <h1>{["Dados do colaborador", "Endereços", "Inventário da mudança", "Revisão"][passo - 1]}</h1>
      {passo === 1 ? (
        <div className="grade-form">
          <label className="campo">Nome<input value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} /></label>
          <label className="campo">CPF<input value={dados.cpf} onChange={(e) => setDados({ ...dados, cpf: e.target.value })} /></label>
          <label className="campo">E-mail corporativo<input value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} /></label>
          <label className="campo">Telefone<input value={dados.telefone} onChange={(e) => setDados({ ...dados, telefone: e.target.value })} /></label>
          <label className="campo">Unidade<select value={dados.unidadeId} onChange={(e) => setDados({ ...dados, unidadeId: e.target.value })}>{unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></label>
          <label className="campo">Data prevista<input type="date" value={dados.dataPrevista} onChange={(e) => setDados({ ...dados, dataPrevista: e.target.value })} /></label>
        </div>
      ) : null}
      {passo === 2 ? (
        <div className="grade-form">
          <Endereco titulo="Origem" valor={origem} onChange={setOrigem} onCep={() => cep("origem")} />
          <Endereco titulo="Destino" valor={destino} onChange={setDestino} onCep={() => cep("destino")} />
          <label className="campo">Distância (km)<input value={km} onChange={(e) => setKm(e.target.value)} /></label>
        </div>
      ) : null}
      {passo === 3 ? (
        <>
          <p>{escolhidos.length} bens · {volume.toFixed(2).replace(".", ",")} m³</p>
          <div className="linha">{categorias.map((item) => <button key={item} className={item === categoria ? "btn" : "btn secundario"} type="button" onClick={() => setCategoria(item)}>{item}</button>)}</div>
          <input placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <ul className="lista-tarefas">
            {visiveis.slice(0, 30).map((item) => (
              <li key={item.id}>
                <div><strong>{item.nome}</strong><div className="muted">{item.volumeM3.toFixed(2)} m³</div></div>
                <div className="linha">
                  <button type="button" className="btn secundario" onClick={() => setQtd({ ...qtd, [item.id]: Math.max(0, (qtd[item.id] || 0) - 1) })}>−</button>
                  <span>{qtd[item.id] || 0}</span>
                  <button type="button" className="btn secundario" onClick={() => setQtd({ ...qtd, [item.id]: (qtd[item.id] || 0) + 1 })}>+</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {passo === 4 ? (
        <div>
          <p>{dados.nome} · {origem.cidade}/{origem.uf} → {destino.cidade}/{destino.uf}</p>
          <p>{volume.toFixed(2)} m³ · {km} km</p>
          <label className="campo">Valor declarado (R$)<input value={declarado} onChange={(e) => setDeclarado(e.target.value)} /></label>
          <p className="muted">O total é calculado no servidor: preço da faixa por km × km + percentual de seguro × valor declarado. Sem faixa, o pedido segue para análise.</p>
        </div>
      ) : null}
      {erro ? <p className="alerta">{erro}</p> : null}
      <div className="linha">
        {passo > 1 ? <button className="btn secundario" type="button" onClick={() => setPasso(passo - 1)}>Voltar</button> : null}
        {passo < 4 ? <button className="btn" type="button" onClick={() => setPasso(passo + 1)}>Continuar</button> : <button className="btn" type="button" onClick={enviar}>Enviar solicitação</button>}
      </div>
    </section>
  );
}

function Endereco({
  titulo,
  valor,
  onChange,
  onCep,
}: {
  titulo: string;
  valor: { cep: string; endereco: string; cidade: string; uf: string };
  onChange: (valor: { cep: string; endereco: string; cidade: string; uf: string }) => void;
  onCep: () => void;
}) {
  return (
    <fieldset className="limpo campo largo">
      <legend>{titulo}</legend>
      <label className="campo">CEP<input value={valor.cep} onChange={(e) => onChange({ ...valor, cep: e.target.value })} /></label>
      <button className="btn secundario" type="button" onClick={onCep}>Buscar CEP</button>
      <label className="campo">Endereço<input value={valor.endereco} onChange={(e) => onChange({ ...valor, endereco: e.target.value })} /></label>
      <label className="campo">Cidade<input value={valor.cidade} onChange={(e) => onChange({ ...valor, cidade: e.target.value })} /></label>
      <label className="campo">UF<input value={valor.uf} onChange={(e) => onChange({ ...valor, uf: e.target.value })} /></label>
    </fieldset>
  );
}
