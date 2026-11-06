"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UFS } from "@/lib/format";
import { formatarCep } from "@/server/cep-publico";

const IMOVEIS = ["Apartamento", "Casa", "Escritório", "Galpão"];

export type PartesEndereco = {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
};

export function EnderecoFicha({
  lado,
  titulo,
  partes,
  cidade,
  uf,
  referencia,
  imovel,
  andar,
  elevador,
}: {
  lado: "origem" | "destino";
  titulo: string;
  partes: PartesEndereco;
  cidade: string;
  uf: string;
  referencia: string;
  imovel: string;
  andar: string;
  elevador: string;
}) {
  const [cep, setCep] = useState(partes.cep || "");
  const [logradouro, setLogradouro] = useState(partes.logradouro || "");
  const [numero, setNumero] = useState(partes.numero || "");
  const [complemento, setComplemento] = useState(partes.complemento || "");
  const [bairro, setBairro] = useState(partes.bairro || "");
  const [cidadeAtual, setCidadeAtual] = useState(cidade);
  const [ufAtual, setUfAtual] = useState(uf);
  const [imovelAtual, setImovelAtual] = useState(imovel);
  const [cidades, setCidades] = useState<string[]>([]);
  const [aviso, setAviso] = useState("");
  const [buscando, setBuscando] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    if (!ufAtual) {
      setCidades([]);
      return;
    }
    let vivo = true;
    fetch(`/api/publico/municipios?uf=${ufAtual}`)
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
  }, [ufAtual]);

  const sugestoes = useMemo(() => {
    const termo = cidadeAtual.trim().toLocaleLowerCase("pt-BR");
    const base = termo ? cidades.filter((item) => item.toLocaleLowerCase("pt-BR").includes(termo)) : cidades;
    return base.slice(0, 8);
  }, [cidades, cidadeAtual]);

  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    const marca = ++pedido.current;
    setBuscando(true);
    setAviso("");
    try {
      const resposta = await fetch(`/api/publico/cep?cep=${digitos}`);
      const json = (await resposta.json()) as { logradouro?: string; bairro?: string; cidade?: string; uf?: string; cep?: string; erro?: string };
      if (marca !== pedido.current) return;
      if (!resposta.ok || !json.uf) {
        setAviso(json.erro || "CEP não encontrado. Preencha o endereço.");
        return;
      }
      if (json.logradouro) setLogradouro(json.logradouro);
      if (json.bairro) setBairro(json.bairro);
      if (json.cidade) setCidadeAtual(json.cidade);
      if (UFS.includes(json.uf as (typeof UFS)[number])) setUfAtual(json.uf);
      if (json.cep) setCep(json.cep);
    } catch {
      if (marca === pedido.current) setAviso("Não foi possível consultar o CEP. O endereço continua editável.");
    } finally {
      if (marca === pedido.current) setBuscando(false);
    }
  }

  const prefixo = lado;
  const apartamento = imovelAtual === "Apartamento";
  const opcoesImovel = IMOVEIS.includes(imovelAtual) || !imovelAtual ? IMOVEIS : [imovelAtual, ...IMOVEIS];

  return (
    <div className="grade-form">
      <label className="campo">
        <span>CEP</span>
        <input
          name={`${prefixo}Cep`}
          inputMode="numeric"
          autoComplete={`section-${lado} postal-code`}
          placeholder="00000-000"
          value={cep}
          onChange={(evento) => {
            const proximo = formatarCep(evento.target.value);
            setCep(proximo);
            if (proximo.replace(/\D/g, "").length === 8) void buscarCep(proximo);
          }}
          onBlur={() => void buscarCep(cep)}
        />
      </label>
      <p className="muted campo-aviso">{buscando ? "Buscando CEP…" : aviso}</p>
      <label className="campo largo">
        <span>Logradouro</span>
        <input name={`${prefixo}Logradouro`} autoComplete={`section-${lado} address-line1`} value={logradouro} onChange={(evento) => setLogradouro(evento.target.value)} />
      </label>
      <label className="campo">
        <span>Número</span>
        <input name={`${prefixo}Numero`} value={numero} onChange={(evento) => setNumero(evento.target.value)} />
      </label>
      <label className="campo">
        <span>Complemento</span>
        <input name={`${prefixo}Complemento`} value={complemento} onChange={(evento) => setComplemento(evento.target.value)} />
      </label>
      <label className="campo">
        <span>Bairro</span>
        <input name={`${prefixo}Bairro`} value={bairro} onChange={(evento) => setBairro(evento.target.value)} />
      </label>
      <label className="campo">
        <span>UF</span>
        <select
          name={`${prefixo}Uf`}
          value={ufAtual}
          onChange={(evento) => {
            setUfAtual(evento.target.value);
            setCidadeAtual("");
          }}
        >
          <option value="">Selecione</option>
          {UFS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Cidade</span>
        <input name={`${prefixo}Cidade`} value={cidadeAtual} list={`${lado}-cidades`} disabled={!ufAtual} placeholder={ufAtual ? "Digite para filtrar" : "Escolha a UF"} onChange={(evento) => setCidadeAtual(evento.target.value)} />
        <datalist id={`${lado}-cidades`}>
          {sugestoes.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </label>
      <label className="campo">
        <span>Tipo de imóvel</span>
        <select name={`${prefixo}Imovel`} value={imovelAtual} onChange={(evento) => setImovelAtual(evento.target.value)}>
          <option value="">Selecione</option>
          {opcoesImovel.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      {apartamento ? (
        <>
          <label className="campo">
            <span>Andar</span>
            <input name={`${prefixo}Andar`} defaultValue={andar} />
          </label>
          <label className="campo">
            <span>Elevador</span>
            <select name={`${prefixo}Elevador`} defaultValue={elevador}>
              <option value="">Selecione</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </label>
        </>
      ) : (
        <>
          <input type="hidden" name={`${prefixo}Andar`} value="" />
          <input type="hidden" name={`${prefixo}Elevador`} value="" />
        </>
      )}
      <label className="campo largo">
        <span>Ponto de referência</span>
        <input name={`${prefixo}Referencia`} defaultValue={referencia} />
      </label>
      <p className="muted largo">{titulo}: o número e o complemento não são substituídos pelo CEP.</p>
    </div>
  );
}
