"use client";

import { useMemo, useState } from "react";
import { PAPEIS_CONTATO_OPORTUNIDADE, rotuloPapelContato, type PapelContatoOportunidade, type VinculoContato } from "@/lib/contatos-oportunidade";

export type ContatoFicha = {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  cargo?: string | null;
  cpf?: string | null;
  documento?: string | null;
};

type Novo = { nome: string; email: string; telefone: string; cargo: string; cpf: string; documento: string };
type Ligacao = {
  chave: string;
  contatoId?: string;
  papel: PapelContatoOportunidade;
  novo?: Novo;
  resumo: ContatoFicha;
  principal?: boolean;
};

const vazio: Novo = { nome: "", email: "", telefone: "", cargo: "", cpf: "", documento: "" };

export function ContatosOportunidade({
  contatos,
  vinculos,
  principalId,
}: {
  contatos: ContatoFicha[];
  vinculos: VinculoContato[];
  principalId: string;
}) {
  const [ligados, setLigados] = useState<Ligacao[]>(() =>
    vinculos.map((item) => {
      const contato = contatos.find((atual) => atual.id === item.contatoId);
      return {
        chave: item.contatoId,
        contatoId: item.contatoId,
        papel: item.papel,
        resumo: contato ?? { id: item.contatoId, nome: "Contato" },
      };
    }),
  );
  const [principal, setPrincipal] = useState(principalId);
  const [abertos, setAbertos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [listaAberta, setListaAberta] = useState(false);
  const [indice, setIndice] = useState(0);
  const [papel, setPapel] = useState<PapelContatoOportunidade | "">("");
  const [cadastrando, setCadastrando] = useState(false);
  const [rascunho, setRascunho] = useState<Novo>(vazio);
  const [aviso, setAviso] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return contatos
      .filter((contato) => !ligados.some((item) => item.contatoId === contato.id))
      .filter((contato) => !termo || contato.nome.toLocaleLowerCase("pt-BR").includes(termo))
      .slice(0, 8);
  }, [busca, contatos, ligados]);

  const principalContato = contatos.find((contato) => contato.id === principal);
  const principalNaLista = ligados.some((item) => item.contatoId === principal);

  function payload() {
    return ligados.map((item) => ({
      contatoId: item.contatoId,
      papel: item.papel,
      principal: item.chave === principal && !item.contatoId ? true : undefined,
      novo: item.novo
        ? {
            nome: item.novo.nome,
            email: item.novo.email || undefined,
            telefone: item.novo.telefone || undefined,
            cargo: item.novo.cargo || undefined,
            cpf: item.novo.cpf || undefined,
            documento: item.novo.documento || undefined,
          }
        : undefined,
    }));
  }

  function adicionarExistente(contato: ContatoFicha) {
    if (!papel) {
      setAviso("Escolha o papel na oportunidade antes de adicionar.");
      return;
    }
    if (ligados.some((item) => item.contatoId === contato.id)) {
      setAviso("Este contato já está na oportunidade.");
      return;
    }
    setLigados((atual) => [...atual, { chave: contato.id, contatoId: contato.id, papel, resumo: contato }]);
    setBusca("");
    setListaAberta(false);
    setAviso("");
  }

  function adicionarNovo() {
    if (!papel) {
      setAviso("Escolha o papel na oportunidade antes de adicionar.");
      return;
    }
    if (rascunho.nome.trim().length < 2) {
      setAviso("O nome do contato precisa de ao menos 2 caracteres.");
      return;
    }
    const chave = `novo-${crypto.randomUUID()}`;
    setLigados((atual) => [
      ...atual,
      { chave, papel, novo: rascunho, resumo: { id: chave, ...rascunho } },
    ]);
    setRascunho(vazio);
    setCadastrando(false);
    setAviso("");
  }

  return (
    <div className="campo largo contatos-oportunidade">
      <span>Contatos</span>
      <input type="hidden" name="contatosVinculo" value={JSON.stringify(payload())} />
      <input type="hidden" name="contatoPrincipalId" value={principal && !principal.startsWith("novo-") ? principal : ""} />
      {principal && !principalNaLista ? (
        <article className="contato-ficha">
          <button type="button" className="cabeca" aria-expanded={abertos.includes(principal)} onClick={() => setAbertos((atual) => (atual.includes(principal) ? atual.filter((id) => id !== principal) : [...atual, principal]))}>
            <strong>{principalContato?.nome || "Contato principal"}</strong>
            <span className="muted">Principal</span>
          </button>
          {abertos.includes(principal) ? <Detalhe contato={principalContato} papel="" /> : null}
        </article>
      ) : null}
      {ligados.map((item) => {
        const aberto = abertos.includes(item.chave);
        return (
          <article key={item.chave} className="contato-ficha">
            <button
              type="button"
              className="cabeca"
              aria-expanded={aberto}
              aria-controls={`contato-${item.chave}`}
              onClick={() => setAbertos((atual) => (atual.includes(item.chave) ? atual.filter((id) => id !== item.chave) : [...atual, item.chave]))}
            >
              <strong>{item.resumo.nome}</strong>
              <span className="muted">
                {rotuloPapelContato(item.papel)}
                {item.contatoId === principal || item.chave === principal ? " · Principal" : ""}
              </span>
            </button>
            {aberto ? (
              <div id={`contato-${item.chave}`}>
                <Detalhe contato={item.resumo} papel={rotuloPapelContato(item.papel)} />
                <div className="linha">
                  {item.chave !== principal ? (
                    <button type="button" className="btn secundario" onClick={() => setPrincipal(item.chave)}>
                      Marcar como principal
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn secundario"
                    onClick={() => {
                      setLigados((atual) => atual.filter((ligado) => ligado.chave !== item.chave));
                      if (principal === item.chave || principal === item.contatoId) setPrincipal("");
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
      <label className="campo">
        <span>Papel na oportunidade</span>
        <select value={papel} onChange={(evento) => setPapel(evento.target.value as PapelContatoOportunidade | "")}>
          <option value="">Selecione o papel</option>
          {PAPEIS_CONTATO_OPORTUNIDADE.map((item) => (
            <option key={item.id} value={item.id}>
              {item.rotulo}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">O papel é deste lead. O cargo profissional fica no cadastro do contato.</p>
      <input
        role="combobox"
        aria-expanded={listaAberta}
        aria-controls="lista-contatos-oportunidade"
        aria-autocomplete="list"
        value={busca}
        placeholder="Buscar contato deste cliente"
        onFocus={() => setListaAberta(true)}
        onBlur={() => setTimeout(() => setListaAberta(false), 150)}
        onChange={(evento) => {
          setBusca(evento.target.value);
          setListaAberta(true);
          setIndice(0);
        }}
        onKeyDown={(evento) => {
          if (evento.key === "ArrowDown") {
            evento.preventDefault();
            setIndice((atual) => Math.min(filtrados.length - 1, atual + 1));
          } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            setIndice((atual) => Math.max(0, atual - 1));
          } else if (evento.key === "Enter" && listaAberta && filtrados[indice]) {
            evento.preventDefault();
            adicionarExistente(filtrados[indice]);
          } else if (evento.key === "Escape") {
            setListaAberta(false);
          }
        }}
      />
      {listaAberta ? (
        <ul id="lista-contatos-oportunidade" role="listbox" className="sugestoes">
          {filtrados.length === 0 ? <li className="muted">Nenhum contato com esse nome neste cliente.</li> : null}
          {filtrados.map((contato, posicao) => (
            <li key={contato.id}>
              <button type="button" role="option" aria-selected={posicao === indice} onMouseDown={(evento) => evento.preventDefault()} onClick={() => adicionarExistente(contato)}>
                {contato.nome}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!cadastrando ? (
        <button type="button" className="btn secundario" onClick={() => setCadastrando(true)}>
          Cadastrar contato
        </button>
      ) : (
        <div className="grade-form">
          {(["nome", "email", "telefone", "cargo", "cpf", "documento"] as const).map((campo) => (
            <label key={campo} className="campo">
              <span>{campo === "cargo" ? "Cargo profissional" : campo === "nome" ? "Nome" : campo === "email" ? "E-mail" : campo === "telefone" ? "Telefone" : campo === "cpf" ? "CPF" : "Documento"}</span>
              <input value={rascunho[campo]} onChange={(evento) => setRascunho((atual) => ({ ...atual, [campo]: evento.target.value }))} />
            </label>
          ))}
          <button type="button" className="btn secundario" onClick={adicionarNovo}>
            Adicionar à oportunidade
          </button>
          <button type="button" className="btn secundario" onClick={() => setCadastrando(false)}>
            Cancelar
          </button>
        </div>
      )}
      {aviso ? <p className="muted">{aviso}</p> : null}
    </div>
  );
}

function Detalhe({ contato, papel }: { contato?: ContatoFicha; papel: string }) {
  if (!contato) return <p className="muted">Detalhes indisponíveis.</p>;
  return (
    <dl className="contato-detalhe">
      {papel ? (
        <div>
          <dt>Papel na oportunidade</dt>
          <dd>{papel}</dd>
        </div>
      ) : null}
      <div>
        <dt>E-mail</dt>
        <dd>{contato.email || "não informado"}</dd>
      </div>
      <div>
        <dt>Telefone</dt>
        <dd>{contato.telefone || "não informado"}</dd>
      </div>
      <div>
        <dt>Cargo profissional</dt>
        <dd>{contato.cargo || "não informado"}</dd>
      </div>
      <div>
        <dt>CPF</dt>
        <dd>{contato.cpf || "não informado"}</dd>
      </div>
      <div>
        <dt>Documento</dt>
        <dd>{contato.documento || "não informado"}</dd>
      </div>
    </dl>
  );
}
