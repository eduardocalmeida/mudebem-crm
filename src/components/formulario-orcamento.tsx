"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { UFS } from "@/lib/format";
import { formatarCep } from "@/server/cep-publico";
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

type Imovel = "" | "Apartamento" | "Casa" | "Escritório" | "Galpão";
type Elevador = "" | "Sim" | "Não";

type EnderecoForm = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  uf: string;
  cidade: string;
  imovel: Imovel;
  andar: string;
  elevador: Elevador;
  referencia: string;
};

const IMOVEIS: Exclude<Imovel, "">[] = ["Apartamento", "Casa", "Escritório", "Galpão"];
const COMO_CONHECEU = ["Google", "Instagram", "Facebook", "Indicação", "Já fui cliente", "Outro"];
const ETAPAS = ["Contato", "Origem", "Destino", "Inventário", "Envio"];

const ENDERECO_VAZIO: EnderecoForm = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  uf: "",
  cidade: "",
  imovel: "",
  andar: "",
  elevador: "",
  referencia: "",
};

function semAcento(valor: string) {
  return valor.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
}

export function FormularioOrcamento({
  catalogo,
  embed,
  atribuicao,
}: {
  catalogo: ItemDoCatalogo[];
  embed: boolean;
  atribuicao: Atribuicao;
}) {
  const [etapa, setEtapa] = useState(1);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataPretendida, setDataPretendida] = useState("");
  const [origem, setOrigem] = useState<EnderecoForm>(ENDERECO_VAZIO);
  const [destino, setDestino] = useState<EnderecoForm>(ENDERECO_VAZIO);
  const [comoConheceu, setComoConheceu] = useState("");
  const [transferencia, setTransferencia] = useState<"" | "sim" | "nao">("");
  const [empresaTrabalho, setEmpresaTrabalho] = useState("");
  const [busca, setBusca] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [website, setWebsite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    if (!embed) return;
    const enviarAltura = () => {
      window.parent.postMessage({ tipo: "mudebem-altura", altura: document.body.scrollHeight + 24 }, "*");
    };
    enviarAltura();
    const observador = new ResizeObserver(enviarAltura);
    observador.observe(document.body);
    return () => observador.disconnect();
  }, [embed, codigo, linhas.length, etapa]);

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

  function validarEtapa(numero: number) {
    if (numero === 1) return validarContato(nome, email, telefone);
    if (numero === 2) return validarEndereco(origem, "origem");
    if (numero === 3) return validarEndereco(destino, "destino");
    if (numero === 4) return catalogo.length > 0 && linhas.length === 0 ? "Adicione pelo menos um item do catálogo." : "";
    if (!comoConheceu) return "Conte como conheceu a Mude Bem.";
    if (!transferencia) return "Diga se a mudança é por transferência de empresa.";
    return "";
  }

  function avancar() {
    const mensagem = validarEtapa(etapa);
    setErro(mensagem);
    if (mensagem) return;
    setEtapa((atual) => Math.min(5, atual + 1));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (etapa < 5) {
      avancar();
      return;
    }
    const mensagem = validarEtapa(5);
    setErro(mensagem);
    if (mensagem) return;
    setEnviando(true);
    const corpo = {
      nome,
      email,
      telefone,
      dataPretendida,
      ...enderecoParaApi("origem", origem),
      ...enderecoParaApi("destino", destino),
      comoConheceu,
      transferenciaEmpresa: transferencia === "sim",
      empresaTrabalho: transferencia === "sim" ? empresaTrabalho : "",
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
      <div className="passo-cabeca">
        <p className="sobretitulo">Etapa {etapa} de 5</p>
        <ol className="passos" aria-label="Progresso do orçamento">
          {ETAPAS.map((titulo, indice) => {
            const numero = indice + 1;
            const classe = numero === etapa ? "atual" : numero < etapa ? "feito" : "";
            return (
              <li key={titulo} className={classe} aria-current={numero === etapa ? "step" : undefined}>
                <span />
                <em>{titulo}</em>
              </li>
            );
          })}
        </ol>
      </div>
      {erro ? <p className="alerta" role="alert">{erro}</p> : null}
      {etapa === 1 ? (
        <section className="cartao bloco">
          <h2>Contato</h2>
          <div className="grade-form">
            <label className="campo">
              <span>Nome</span>
              <input name="nome" required autoComplete="name" value={nome} onChange={(evento) => setNome(evento.target.value)} />
            </label>
            <label className="campo">
              <span>E-mail</span>
              <input name="email" type="email" autoComplete="email" value={email} onChange={(evento) => setEmail(evento.target.value)} />
            </label>
            <label className="campo">
              <span>Telefone (WhatsApp)</span>
              <input name="telefone" autoComplete="tel" inputMode="tel" placeholder="(62) 99999-0000" value={telefone} onChange={(evento) => setTelefone(evento.target.value)} />
            </label>
            <label className="campo">
              <span>Data prevista da mudança</span>
              <input name="dataPretendida" type="date" value={dataPretendida} onChange={(evento) => setDataPretendida(evento.target.value)} />
            </label>
          </div>
        </section>
      ) : null}
      {etapa === 2 ? <EnderecoPasso titulo="Origem" secao="origem" valor={origem} aoMudar={setOrigem} /> : null}
      {etapa === 3 ? <EnderecoPasso titulo="Destino" secao="destino" valor={destino} aoMudar={setDestino} /> : null}
      {etapa === 4 ? (
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
                    aria-label={`Cômodo de ${linha.nome}`}
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
                    aria-label={`Quantidade de ${linha.nome}`}
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
                  <button className="btn secundario" type="button" onClick={() => setLinhas((atual) => atual.filter((item) => item.chave !== linha.chave))}>
                    Tirar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {etapa === 5 ? (
        <section className="cartao bloco">
          <h2>Para fechar o pedido</h2>
          <div className="grade-form">
            <label className="campo">
              <span>Como conheceu a Mude Bem</span>
              <select value={comoConheceu} onChange={(evento) => setComoConheceu(evento.target.value)} required>
                <option value="">Selecione</option>
                {COMO_CONHECEU.map((opcao) => (
                  <option key={opcao}>{opcao}</option>
                ))}
              </select>
            </label>
            <fieldset className="campo largo">
              <legend>A mudança é por transferência de empresa? A empresa do trabalho custeia?</legend>
              <div className="escolha">
                <label>
                  <input type="radio" name="transferencia" checked={transferencia === "sim"} onChange={() => setTransferencia("sim")} />
                  Sim
                </label>
                <label>
                  <input type="radio" name="transferencia" checked={transferencia === "nao"} onChange={() => setTransferencia("nao")} />
                  Não
                </label>
              </div>
            </fieldset>
            {transferencia === "sim" ? (
              <label className="campo largo">
                <span>Nome da empresa <em className="opcional">opcional</em></span>
                <input value={empresaTrabalho} onChange={(evento) => setEmpresaTrabalho(evento.target.value)} placeholder="Pode deixar em branco" />
              </label>
            ) : null}
          </div>
        </section>
      ) : null}
      <div className="acoes-passo">
        {etapa > 1 ? (
          <button className="btn secundario" type="button" onClick={() => { setErro(""); setEtapa((atual) => atual - 1); }}>
            Voltar
          </button>
        ) : <span />}
        {etapa < 5 ? (
          <button className="btn primario" type="button" onClick={avancar}>Avançar</button>
        ) : (
          <button className="btn primario" type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Enviar"}</button>
        )}
      </div>
    </form>
  );
}

function validarContato(nome: string, email: string, telefone: string) {
  if (nome.trim().length < 2) return "Informe o nome.";
  const emailLimpo = email.trim();
  const fone = telefone.replace(/\D/g, "");
  if (emailLimpo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) return "E-mail inválido.";
  if (!emailLimpo && fone.length < 8) return "Informe e-mail ou telefone (WhatsApp).";
  if (telefone.trim() && fone.length < 8) return "Telefone incompleto.";
  return "";
}

function validarEndereco(endereco: EnderecoForm, lado: "origem" | "destino") {
  const onde = lado === "origem" ? "da origem" : "do destino";
  const cep = endereco.cep.replace(/\D/g, "");
  if (cep && cep.length !== 8) return `O CEP ${onde} precisa ter 8 dígitos.`;
  if (!endereco.logradouro.trim()) return `Informe o logradouro ${onde}.`;
  if (!endereco.numero.trim()) return `Informe o número ${onde}.`;
  if (!endereco.bairro.trim()) return `Informe o bairro ${onde}.`;
  if (!endereco.uf) return `Selecione a UF ${onde}.`;
  if (endereco.cidade.trim().length < 2) return `Informe a cidade ${onde}.`;
  if (!endereco.imovel) return `Selecione o tipo de imóvel ${onde}.`;
  if (endereco.imovel === "Apartamento") {
    if (!endereco.andar.trim()) return `Informe o andar ${onde}.`;
    if (endereco.elevador !== "Sim" && endereco.elevador !== "Não") return `Diga se há elevador ${onde}.`;
  }
  return "";
}

function enderecoParaApi(prefixo: "origem" | "destino", endereco: EnderecoForm) {
  const apartamento = endereco.imovel === "Apartamento";
  return {
    [`${prefixo}Cep`]: endereco.cep,
    [`${prefixo}Logradouro`]: endereco.logradouro,
    [`${prefixo}Numero`]: endereco.numero,
    [`${prefixo}Complemento`]: endereco.complemento,
    [`${prefixo}Bairro`]: endereco.bairro,
    [`${prefixo}Cidade`]: endereco.cidade,
    [`${prefixo}Uf`]: endereco.uf,
    [`${prefixo}Referencia`]: endereco.referencia,
    [`${prefixo}Imovel`]: endereco.imovel,
    [`${prefixo}Andar`]: apartamento ? endereco.andar : "",
    [`${prefixo}Elevador`]: apartamento ? endereco.elevador : "",
  };
}

function EnderecoPasso({
  titulo,
  secao,
  valor,
  aoMudar,
}: {
  titulo: string;
  secao: "origem" | "destino";
  valor: EnderecoForm;
  aoMudar: Dispatch<SetStateAction<EnderecoForm>>;
}) {
  const [cidades, setCidades] = useState<string[]>([]);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState("");
  const [listaAberta, setListaAberta] = useState(false);

  useEffect(() => {
    if (!valor.uf) {
      setCidades([]);
      return;
    }
    let vivo = true;
    fetch(`/api/publico/municipios?uf=${valor.uf}`)
      .then((resposta) => resposta.json())
      .then((json: { municipios?: string[] }) => {
        if (vivo) setCidades(json.municipios ?? []);
      })
      .catch(() => {
        if (vivo) setCidades([]);
      });
    return () => {
      vivo = false;
    };
  }, [valor.uf]);

  const sugestoes = useMemo(() => {
    const termo = semAcento(valor.cidade.trim());
    if (!termo) return cidades.slice(0, 8);
    return cidades.filter((cidade) => semAcento(cidade).includes(termo)).slice(0, 8);
  }, [cidades, valor.cidade]);

  function alterar(parcial: Partial<EnderecoForm>) {
    aoMudar((atual) => {
      const proximo = { ...atual, ...parcial };
      if (proximo.imovel !== "Apartamento") {
        proximo.andar = "";
        proximo.elevador = "";
      }
      return proximo;
    });
  }

  async function buscarCep(cep: string) {
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    setBuscandoCep(true);
    setAvisoCep("");
    try {
      const resposta = await fetch(`/api/publico/cep?cep=${digitos}`);
      const json = (await resposta.json()) as { logradouro?: string; bairro?: string; cidade?: string; uf?: string; cep?: string };
      if (!resposta.ok || !json.uf) {
        setAvisoCep("Não achamos esse CEP. Preencha o endereço.");
        return;
      }
      alterar({
        cep: json.cep || formatarCep(digitos),
        logradouro: json.logradouro || valor.logradouro,
        bairro: json.bairro || valor.bairro,
        cidade: json.cidade || valor.cidade,
        uf: (UFS.includes(json.uf as (typeof UFS)[number]) ? json.uf : valor.uf) as EnderecoForm["uf"],
      });
    } catch {
      setAvisoCep("Não achamos esse CEP. Preencha o endereço.");
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <section className="cartao bloco">
      <h2>{titulo}</h2>
      <div className="grade-form">
        <label className="campo">
          <span>CEP</span>
          <input
            inputMode="numeric"
            autoComplete={`section-${secao} postal-code`}
            placeholder="00000-000"
            value={valor.cep}
            onChange={(evento) => {
              const cep = formatarCep(evento.target.value);
              alterar({ cep });
              if (cep.replace(/\D/g, "").length === 8) void buscarCep(cep);
            }}
            onBlur={() => void buscarCep(valor.cep)}
          />
        </label>
        <p className="muted campo-aviso">{buscandoCep ? "Buscando CEP…" : avisoCep}</p>
        <label className="campo largo">
          <span>Logradouro</span>
          <input autoComplete={`section-${secao} address-line1`} value={valor.logradouro} onChange={(evento) => alterar({ logradouro: evento.target.value })} />
        </label>
        <label className="campo">
          <span>Número</span>
          <input value={valor.numero} onChange={(evento) => alterar({ numero: evento.target.value })} />
        </label>
        <label className="campo">
          <span>Complemento</span>
          <input autoComplete={`section-${secao} address-line2`} value={valor.complemento} onChange={(evento) => alterar({ complemento: evento.target.value })} />
        </label>
        <label className="campo">
          <span>Bairro</span>
          <input value={valor.bairro} onChange={(evento) => alterar({ bairro: evento.target.value })} />
        </label>
        <label className="campo">
          <span>UF</span>
          <select
            value={valor.uf}
            onChange={(evento) => alterar({ uf: evento.target.value, cidade: "" })}
          >
            <option value="">Selecione</option>
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </label>
        <label className="campo cidade-campo">
          <span>Cidade</span>
          <input
            value={valor.cidade}
            autoComplete="off"
            disabled={!valor.uf}
            placeholder={valor.uf ? "Digite para filtrar" : "Escolha a UF antes"}
            onFocus={() => setListaAberta(true)}
            onBlur={() => setTimeout(() => setListaAberta(false), 150)}
            onChange={(evento) => {
              alterar({ cidade: evento.target.value });
              setListaAberta(true);
            }}
          />
          {listaAberta && valor.uf && sugestoes.length > 0 ? (
            <ul className="sugestoes">
              {sugestoes.map((cidade) => (
                <li key={cidade}>
                  <button
                    type="button"
                    onMouseDown={(evento) => evento.preventDefault()}
                    onClick={() => {
                      alterar({ cidade });
                      setListaAberta(false);
                    }}
                  >
                    {cidade}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
        <label className="campo">
          <span>Tipo de imóvel</span>
          <select value={valor.imovel} onChange={(evento) => alterar({ imovel: evento.target.value as Imovel })}>
            <option value="">Selecione</option>
            {IMOVEIS.map((tipo) => (
              <option key={tipo}>{tipo}</option>
            ))}
          </select>
        </label>
        {valor.imovel === "Apartamento" ? (
          <>
            <label className="campo">
              <span>Andar</span>
              <input value={valor.andar} onChange={(evento) => alterar({ andar: evento.target.value })} />
            </label>
            <label className="campo">
              <span>Elevador</span>
              <select value={valor.elevador} onChange={(evento) => alterar({ elevador: evento.target.value as Elevador })}>
                <option value="">Selecione</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </label>
          </>
        ) : null}
        <label className="campo largo">
          <span>Ponto de referência</span>
          <input value={valor.referencia} onChange={(evento) => alterar({ referencia: evento.target.value })} />
        </label>
      </div>
    </section>
  );
}
