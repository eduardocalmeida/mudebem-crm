"use client";

import { useEffect, useMemo, useState } from "react";
import { UFS } from "@/lib/format";
import { COMODOS } from "@/server/catalogo-mudanca";

export type ItemDoCatalogo = { id: string; nome: string; categoria: string; volumeM3: number };

type Linha = ItemDoCatalogo & { chave: string; comodo: string; quantidade: number };

type Atribuicao = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  fbclid: string;
  gclid: string;
  referrer: string;
};

const IMOVEIS = ["Apartamento", "Casa", "Escritório", "Galpão", "Outro"];
const ELEVADORES = ["", "Sim", "Não"];

export function FormularioOrcamento({
  catalogo,
  embed,
  atribuicao,
}: {
  catalogo: ItemDoCatalogo[];
  embed: boolean;
  atribuicao: Atribuicao;
}) {
  const [busca, setBusca] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [website, setWebsite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    if (!embed) return;
    const enviar = () => {
      window.parent.postMessage({ tipo: "mudebem-altura", altura: document.body.scrollHeight + 24 }, "*");
    };
    enviar();
    const observador = new ResizeObserver(enviar);
    observador.observe(document.body);
    return () => observador.disconnect();
  }, [embed, codigo, linhas.length]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return catalogo.filter((item) => !termo || item.nome.toLocaleLowerCase("pt-BR").includes(termo));
  }, [busca, catalogo]);

  const totais = linhas.reduce(
    (soma, linha) => ({
      quantidade: soma.quantidade + linha.quantidade,
      volume: soma.volume + linha.quantidade * linha.volumeM3,
    }),
    { quantidade: 0, volume: 0 },
  );

  function adicionar(item: ItemDoCatalogo) {
    setLinhas((atual) => [
      ...atual,
      { ...item, chave: `${item.id}-${atual.length}-${Date.now()}`, comodo: "SALA", quantidade: 1 },
    ]);
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    const corpo = {
      nome: String(dados.get("nome") || ""),
      email: String(dados.get("email") || ""),
      telefone: String(dados.get("telefone") || ""),
      observacoes: String(dados.get("observacoes") || ""),
      origemEndereco: String(dados.get("origemEndereco") || ""),
      origemCidade: String(dados.get("origemCidade") || ""),
      origemUf: String(dados.get("origemUf") || ""),
      origemReferencia: String(dados.get("origemReferencia") || ""),
      origemAndar: String(dados.get("origemAndar") || ""),
      origemElevador: String(dados.get("origemElevador") || ""),
      origemImovel: String(dados.get("origemImovel") || ""),
      destinoEndereco: String(dados.get("destinoEndereco") || ""),
      destinoCidade: String(dados.get("destinoCidade") || ""),
      destinoUf: String(dados.get("destinoUf") || ""),
      destinoReferencia: String(dados.get("destinoReferencia") || ""),
      destinoAndar: String(dados.get("destinoAndar") || ""),
      destinoElevador: String(dados.get("destinoElevador") || ""),
      destinoImovel: String(dados.get("destinoImovel") || ""),
      dataPretendida: String(dados.get("dataPretendida") || ""),
      dataColeta: String(dados.get("dataColeta") || ""),
      website,
      ...atribuicao,
      itens: linhas.map((linha) => ({
        catalogoId: linha.id,
        comodo: linha.comodo,
        quantidade: linha.quantidade,
      })),
    };
    try {
      const resposta = await fetch("/api/publico/orcamento", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const json = (await resposta.json()) as { recebido?: boolean; codigo?: string; erro?: string };
      if (!resposta.ok || !json.recebido) {
        setErro(json.erro || "Não foi possível enviar. Tente de novo.");
        return;
      }
      setCodigo(json.codigo || "recebido");
    } catch {
      setErro("Não foi possível enviar. Verifique a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (codigo) {
    return (
      <section className="cartao bloco">
        <h2>Pedido recebido</h2>
        <p>A Mude Bem vai retornar com o orçamento. Guarde o número {codigo === "recebido" ? "do atendimento" : codigo}.</p>
      </section>
    );
  }

  return (
    <form className="orcamento-form" onSubmit={enviar}>
      <div className="hp" aria-hidden="true">
        <label>
          Site
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(evento) => setWebsite(evento.target.value)} />
        </label>
      </div>
      <section className="cartao bloco">
        <h2>Contato</h2>
        <div className="grade-form">
          <label className="campo">
            <span>Nome</span>
            <input name="nome" required autoComplete="name" />
          </label>
          <label className="campo">
            <span>E-mail</span>
            <input name="email" type="email" autoComplete="email" />
          </label>
          <label className="campo">
            <span>Telefone</span>
            <input name="telefone" autoComplete="tel" placeholder="(41) 99999-0000" />
          </label>
          <label className="campo">
            <span>Data pretendida</span>
            <input name="dataPretendida" type="date" />
          </label>
          <label className="campo">
            <span>Data da coleta</span>
            <input name="dataColeta" type="date" />
          </label>
          <label className="campo largo">
            <span>Observações</span>
            <textarea name="observacoes" placeholder="Itens frágeis, restrição de horário, acesso de caminhão." />
          </label>
        </div>
      </section>
      <div className="grade-form">
        <Endereco titulo="Origem" prefixo="origem" />
        <Endereco titulo="Destino" prefixo="destino" />
      </div>
      <section className="cartao bloco">
        <h2>Inventário</h2>
        <p className="muted">
          {totais.quantidade} itens · <strong>{totais.volume.toFixed(2).replace(".", ",")} m³</strong>
        </p>
        <div className="picker">
          <div>
            <label className="campo">
              <span>Buscar no catálogo</span>
              <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Sofá, geladeira, caixa" />
            </label>
            <div className="catalogo-lista">
              {visiveis.map((item) => (
                <button key={item.id} type="button" onClick={() => adicionar(item)}>
                  <strong>{item.nome}</strong>
                  <span>
                    {item.categoria} · {item.volumeM3.toFixed(2).replace(".", ",")} m³
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="linhas-inventario">
            {linhas.length === 0 ? <p className="muted">Nenhum item ainda.</p> : null}
            {linhas.map((linha) => (
              <div key={linha.chave} className="linha-item">
                <div>
                  <strong>{linha.nome}</strong>
                  <div className="muted">{(linha.quantidade * linha.volumeM3).toFixed(2).replace(".", ",")} m³</div>
                </div>
                <select
                  value={linha.comodo}
                  onChange={(evento) =>
                    setLinhas((atual) => atual.map((item) => (item.chave === linha.chave ? { ...item, comodo: evento.target.value } : item)))
                  }
                >
                  {COMODOS.map((comodo) => (
                    <option key={comodo.id} value={comodo.id}>
                      {comodo.rotulo}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={linha.quantidade}
                  onChange={(evento) =>
                    setLinhas((atual) =>
                      atual.map((item) =>
                        item.chave === linha.chave ? { ...item, quantidade: Math.max(1, Number(evento.target.value) || 1) } : item,
                      ),
                    )
                  }
                />
                <button
                  className="btn secundario"
                  type="button"
                  onClick={() => setLinhas((atual) => atual.filter((item) => item.chave !== linha.chave))}
                >
                  Tirar
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      {erro ? <p className="alerta">{erro}</p> : null}
      <button className="btn primario" type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Pedir orçamento"}
      </button>
    </form>
  );
}

function Endereco({ titulo, prefixo }: { titulo: string; prefixo: "origem" | "destino" }) {
  return (
    <section className="cartao bloco">
      <h2>{titulo}</h2>
      <div className="grade-form uma">
        <label className="campo largo">
          <span>Endereço</span>
          <input name={`${prefixo}Endereco`} autoComplete="street-address" />
        </label>
        <label className="campo">
          <span>Cidade</span>
          <input name={`${prefixo}Cidade`} />
        </label>
        <label className="campo">
          <span>UF</span>
          <select name={`${prefixo}Uf`} defaultValue="">
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Imóvel</span>
          <select name={`${prefixo}Imovel`} defaultValue="Apartamento">
            {IMOVEIS.map((tipo) => (
              <option key={tipo}>{tipo}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Andar</span>
          <input name={`${prefixo}Andar`} />
        </label>
        <label className="campo">
          <span>Elevador</span>
          <select name={`${prefixo}Elevador`} defaultValue="">
            {ELEVADORES.map((opcao) => (
              <option key={opcao || "vazio"} value={opcao}>
                {opcao || "—"}
              </option>
            ))}
          </select>
        </label>
        <label className="campo largo">
          <span>Ponto de referência</span>
          <input name={`${prefixo}Referencia`} />
        </label>
      </div>
    </section>
  );
}
