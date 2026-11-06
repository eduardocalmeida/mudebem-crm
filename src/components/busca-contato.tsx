"use client";

import { useMemo, useState } from "react";

export type ContatoOpcao = { id: string; nome: string; email?: string | null; telefone?: string | null };

export function BuscaContato({
  contatos,
  contatoId,
  podeCadastrar,
}: {
  contatos: ContatoOpcao[];
  contatoId: string;
  podeCadastrar: boolean;
}) {
  const inicial = contatos.find((contato) => contato.id === contatoId);
  const [busca, setBusca] = useState(inicial?.nome || "");
  const [escolhido, setEscolhido] = useState(contatoId);
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [cadastrando, setCadastrando] = useState(false);
  const [aviso, setAviso] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return contatos.slice(0, 8);
    return contatos.filter((contato) => contato.nome.toLocaleLowerCase("pt-BR").includes(termo)).slice(0, 8);
  }, [busca, contatos]);

  function selecionar(contato: ContatoOpcao) {
    setEscolhido(contato.id);
    setBusca(contato.nome);
    setCadastrando(false);
    setAberto(false);
    setAviso("");
  }

  return (
    <div className="campo largo busca-contato">
      <span>Contato</span>
      <input type="hidden" name="contatoId" value={cadastrando ? "" : escolhido} />
      <input
        role="combobox"
        aria-expanded={aberto}
        aria-controls="lista-contatos"
        aria-autocomplete="list"
        value={busca}
        placeholder="Buscar pelo nome"
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={(evento) => {
          setBusca(evento.target.value);
          setEscolhido("");
          setAberto(true);
          setIndice(0);
          setAviso("");
        }}
        onKeyDown={(evento) => {
          if (evento.key === "ArrowDown") {
            evento.preventDefault();
            setAberto(true);
            setIndice((atual) => Math.min(filtrados.length - 1, atual + 1));
          } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            setIndice((atual) => Math.max(0, atual - 1));
          } else if (evento.key === "Enter" && aberto && filtrados[indice]) {
            evento.preventDefault();
            selecionar(filtrados[indice]);
          } else if (evento.key === "Escape") {
            setAberto(false);
          }
        }}
      />
      {aberto ? (
        <ul id="lista-contatos" role="listbox" className="sugestoes">
          {filtrados.length === 0 ? <li className="muted">Nenhum contato com esse nome neste cliente.</li> : null}
          {filtrados.map((contato, posicao) => (
            <li key={contato.id}>
              <button type="button" role="option" aria-selected={posicao === indice} onMouseDown={(evento) => evento.preventDefault()} onClick={() => selecionar(contato)}>
                {contato.nome}
                {contato.email || contato.telefone ? <span className="muted"> · {[contato.email, contato.telefone].filter(Boolean).join(" · ")}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {podeCadastrar && !cadastrando ? (
        <button
          className="btn secundario"
          type="button"
          onClick={() => {
            setCadastrando(true);
            setEscolhido("");
            setAberto(false);
            setAviso("");
          }}
        >
          Cadastrar contato
        </button>
      ) : null}
      {cadastrando ? (
        <div className="grade-form">
          <label className="campo">
            <span>Nome</span>
            <input name="contatoNome" required minLength={2} defaultValue={busca} />
          </label>
          <label className="campo">
            <span>E-mail</span>
            <input name="contatoEmail" type="email" />
          </label>
          <label className="campo">
            <span>Telefone</span>
            <input name="contatoTelefone" />
          </label>
          <label className="campo">
            <span>Cargo</span>
            <input name="contatoCargo" />
          </label>
          <label className="campo">
            <span>CPF</span>
            <input name="contatoCpf" />
          </label>
          <label className="campo">
            <span>Documento</span>
            <input name="contatoDocumento" />
          </label>
          <button
            className="btn secundario"
            type="button"
            onClick={() => {
              setCadastrando(false);
              setAviso("Cadastro cancelado. A busca continua disponível.");
            }}
          >
            Cancelar
          </button>
        </div>
      ) : null}
      {aviso ? <p className="muted">{aviso}</p> : null}
    </div>
  );
}
