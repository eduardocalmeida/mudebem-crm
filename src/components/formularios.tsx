"use client";

import { useMemo, useState } from "react";
import { CANAIS, PAPEIS, type Campo } from "@/lib/domain";
import { interpretarData, UFS } from "@/lib/format";
import type { EstadoForm } from "@/lib/estado";
import {
  anexoAction,
  criarChaveAction,
  criarClienteAction,
  criarContatoAction,
  criarProcessoAction,
  criarUsuarioAction,
  notaAction,
  removerAnexoAction,
  revogarChaveAction,
  salvarClienteAction,
  salvarProcessoAction,
  alternarUsuarioAction,
} from "@/server/actions";
import { FormAcao } from "@/components/form-acao";
import { ContatosOportunidade, type ContatoFicha } from "@/components/contatos-oportunidade";
import { FORMAS_PAGAMENTO_FICHA, formaPagamentoDaFicha } from "@/lib/pagamento";
import type { VinculoContato } from "@/lib/contatos-oportunidade";
import { EnderecoFicha, type PartesEndereco } from "@/components/endereco-ficha";

type ClienteOpcao = { id: string; nome: string; contatos: ContatoFicha[] };
type UsuarioOpcao = { id: string; nome: string };
type Valores = Partial<Record<Campo, string>> & {
  origemPartes?: PartesEndereco;
  destinoPartes?: PartesEndereco;
  dataEmbalagem?: string;
  vinculos?: VinculoContato[];
};

export function FormProcesso({
  modo,
  campos,
  clientes,
  usuarios,
  valores,
  processoId,
}: {
  modo: "criar" | "editar";
  campos: Campo[];
  clientes: ClienteOpcao[];
  usuarios: UsuarioOpcao[];
  valores?: Valores;
  processoId?: string;
}) {
  const inicial = valores?.clienteId || clientes[0]?.id || "";
  const [clienteId, setClienteId] = useState(inicial);
  const contatos = useMemo(() => clientes.find((cliente) => cliente.id === clienteId)?.contatos ?? [], [clientes, clienteId]);
  const mostra = (campo: Campo) => campos.includes(campo);
  const acao = modo === "criar" ? criarProcessoAction : salvarProcessoAction;

  const algum = (...lista: Campo[]) => lista.some(mostra);
  const comercial = ["modalidade", "volume", "validadeProposta", "valorFrete", "valorSeguro", "valorTotal", "formaPagamento"] as const;
  const financeiro = ["numeroOc", "numeroNf", "dataEmissao", "dataVencimento", "dataRecebimento"] as const;

  return (
    <FormAcao acao={acao} className="ficha-form">
      {processoId ? <input type="hidden" name="processoId" value={processoId} /> : null}
      {algum(...comercial) ? (
      <article className="cartao bloco">
      <fieldset className="secao-form">
        <legend>Comercial</legend>
        <div className="grade-form">
      {mostra("modalidade") ? <CampoModalidade valor={valores?.modalidade} /> : null}
      {mostra("volume") ? <Campo nome="volume" rotulo="Volume" valor={valores?.volume} /> : null}
      {mostra("validadeProposta") ? <Campo nome="validadeProposta" rotulo="Validade da proposta" tipo="date" valor={valores?.validadeProposta} /> : null}
      {mostra("valorFrete") ? <Campo nome="valorFrete" rotulo="Frete (R$)" valor={valores?.valorFrete} /> : null}
      {mostra("valorSeguro") ? <Campo nome="valorSeguro" rotulo="Seguro (R$)" valor={valores?.valorSeguro} /> : null}
      {mostra("valorTotal") ? <Campo nome="valorTotal" rotulo="Valor total (R$)" valor={valores?.valorTotal} /> : null}
      {mostra("formaPagamento") ? <CampoFormaPagamento valor={valores?.formaPagamento} /> : null}
        </div>
      </fieldset>
      </article>
      ) : null}
      {algum("canal", "clienteId", "contatoId", "colaborador", "responsavelId") ? (
      <article className="cartao bloco">
      <fieldset className="secao-form">
        <legend>Cadastro</legend>
        <div className="grade-form">
      {mostra("canal") ? (
        <label className="campo">
          <span>Canal de origem</span>
          <select name="canal" defaultValue={valores?.canal || "EMAIL"} required>
            {CANAIS.map((canal) => (
              <option key={canal.id} value={canal.id}>
                {canal.rotulo}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {mostra("clienteId") ? (
        <label className="campo">
          <span>Cliente</span>
          <select name="clienteId" value={clienteId} onChange={(evento) => setClienteId(evento.target.value)} required>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {mostra("contatoId") ? (
        <ContatosOportunidade
          key={`${clienteId}:${(valores?.vinculos ?? []).map((item) => item.contatoId + item.papel).join("|")}:${valores?.contatoId ?? ""}`}
          contatos={contatos}
          vinculos={!valores?.clienteId || clienteId === valores.clienteId ? valores?.vinculos ?? [] : []}
          principalId={!valores?.clienteId || clienteId === valores.clienteId ? valores?.contatoId || "" : ""}
        />
      ) : null}
      {mostra("colaborador") ? <Campo nome="colaborador" rotulo="Colaborador em mudança" valor={valores?.colaborador} /> : null}
      {mostra("responsavelId") && modo === "editar" ? (
        <label className="campo">
          <span>Responsável</span>
          <select name="responsavelId" defaultValue={valores?.responsavelId || ""}>
            <option value="">Sem responsável</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}
        </div>
      </fieldset>
      </article>
      ) : null}
      {mostra("origemEndereco") || mostra("origemCidade") ? (
        <article className="cartao bloco">
          <h2>Endereço de origem</h2>
          <EnderecoFicha lado="origem" titulo="Origem" partes={valores?.origemPartes || { logradouro: valores?.origemEndereco }} cidade={valores?.origemCidade || ""} uf={valores?.origemUf || ""} referencia={valores?.origemReferencia || ""} imovel={valores?.origemImovel || ""} andar={valores?.origemAndar || ""} elevador={valores?.origemElevador || ""} />
        </article>
      ) : null}
      {mostra("destinoEndereco") || mostra("destinoCidade") ? (
        <article className="cartao bloco">
          <h2>Endereço de destino</h2>
          <EnderecoFicha lado="destino" titulo="Destino" partes={valores?.destinoPartes || { logradouro: valores?.destinoEndereco }} cidade={valores?.destinoCidade || ""} uf={valores?.destinoUf || ""} referencia={valores?.destinoReferencia || ""} imovel={valores?.destinoImovel || ""} andar={valores?.destinoAndar || ""} elevador={valores?.destinoElevador || ""} />
        </article>
      ) : null}
      {algum("dataPrevista", "dataColeta", "dataEntrega") ? (
        <article className="cartao bloco">
          <h2>Cronograma</h2>
          <div className="grade-form">
            {mostra("dataPrevista") || mostra("dataPretendida") ? <Campo nome="dataPrevista" rotulo="Data prevista" tipo="date" valor={valores?.dataPrevista || valores?.dataPretendida} /> : null}
            {mostra("dataColeta") ? <Campo nome="dataColeta" rotulo="Data de coleta" tipo="date" valor={valores?.dataColeta} /> : null}
            <Campo nome="dataEmbalagem" rotulo="Data de embalagem" tipo="date" valor={valores?.dataEmbalagem} />
            {mostra("dataEntrega") ? <Campo nome="dataEntrega" rotulo="Data de entrega" tipo="date" valor={valores?.dataEntrega} /> : null}
          </div>
        </article>
      ) : null}
      {algum("embalagemNecessaria", "itensEspeciais", "numeroCte", "inventario") ? (
      <article className="cartao bloco">
      <fieldset className="secao-form">
        <legend>Operação</legend>
        <div className="grade-form">
      {mostra("embalagemNecessaria") ? (
        <label className="campo">
          <span>Embalagem necessária</span>
          <select name="embalagemNecessaria" defaultValue={valores?.embalagemNecessaria || ""}>
            <option value="">—</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>
      ) : null}
      {mostra("itensEspeciais") ? <Campo nome="itensEspeciais" rotulo="Itens especiais" valor={valores?.itensEspeciais} className="largo" /> : null}
      {mostra("numeroCte") ? <Campo nome="numeroCte" rotulo="CT-e" valor={valores?.numeroCte} /> : null}
      {mostra("inventario") ? (
        <label className="campo largo">
          <span>Inventário e observações</span>
          <textarea name="inventario" defaultValue={valores?.inventario || ""} />
        </label>
      ) : null}
        </div>
      </fieldset>
      </article>
      ) : null}
      {algum(...financeiro) ? (
      <article className="cartao bloco">
      <fieldset className="secao-form">
        <legend>Financeiro</legend>
        <div className="grade-form">
      {mostra("numeroOc") ? <Campo nome="numeroOc" rotulo="Ordem de compra (OC)" valor={valores?.numeroOc} /> : null}
      {mostra("numeroNf") ? <Campo nome="numeroNf" rotulo="NF / fatura" valor={valores?.numeroNf} /> : null}
      {mostra("dataEmissao") ? <Campo nome="dataEmissao" rotulo="Data de emissão" tipo="date" valor={valores?.dataEmissao} /> : null}
      {mostra("dataVencimento") ? <Campo nome="dataVencimento" rotulo="Vencimento" tipo="date" valor={valores?.dataVencimento} /> : null}
      {mostra("dataRecebimento") ? <Campo nome="dataRecebimento" rotulo="Recebimento" tipo="date" valor={valores?.dataRecebimento} /> : null}
        </div>
      </fieldset>
      </article>
      ) : null}
      {modo === "criar" && mostra("responsavelId") ? <p className="muted">Você será o responsável desta oportunidade.</p> : null}
      <button className="btn primario" type="submit">
        {modo === "criar" ? "Criar processo" : "Salvar alterações"}
      </button>
    </FormAcao>
  );
}

const MODALIDADES = [
  "Intermunicipal exclusiva",
  "Local",
  "Interestadual exclusiva",
  "Interestadual compartilhada",
  "Internacional",
];

function CampoFormaPagamento({ valor }: { valor?: string }) {
  const atual = (valor || "").trim();
  const conhecida = formaPagamentoDaFicha(atual);
  const [escolha, setEscolha] = useState(conhecida ? atual : "");
  return (
    <label className="campo">
      <span>Forma de pagamento</span>
      {atual && !conhecida ? <small className="muted">Atual: {atual}</small> : null}
      <select name={escolha ? "formaPagamento" : undefined} value={escolha} onChange={(evento) => setEscolha(evento.target.value)}>
        <option value="">Selecione</option>
        {FORMAS_PAGAMENTO_FICHA.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function CampoModalidade({ valor }: { valor?: string }) {
  const atual = valor || "";
  const conhecida = !atual || MODALIDADES.includes(atual);
  return (
    <label className="campo">
      <span>Modalidade</span>
      <select name="modalidade" defaultValue={atual}>
        <option value="">Selecione</option>
        {conhecida ? null : <option value={atual}>{atual}</option>}
        {MODALIDADES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function Campo({
  nome,
  rotulo,
  valor,
  tipo = "text",
  className,
  obrigatorio,
}: {
  nome: string;
  rotulo: string;
  valor?: string;
  tipo?: string;
  className?: string;
  obrigatorio?: boolean;
}) {
  return (
    <label className={`campo ${className ?? ""}`.trim()}>
      <span>{rotulo}</span>
      <input
        name={nome}
        type={tipo === "date" ? "date" : tipo}
        defaultValue={tipo === "date" ? (valor ? (interpretarData(valor) ?? "") : "") : valor || ""}
        required={obrigatorio}
      />
    </label>
  );
}

function Uf({ nome, rotulo, valor }: { nome: string; rotulo: string; valor?: string }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <select name={nome} defaultValue={valor || ""}>
        <option value="">—</option>
        {UFS.map((uf) => (
          <option key={uf} value={uf}>
            {uf}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormNota({ processoId }: { processoId: string }) {
  return (
    <FormAcao acao={notaAction}>
      <input type="hidden" name="processoId" value={processoId} />
      <label className="campo">
        <span>Nota</span>
        <textarea name="texto" required placeholder="Registre um combinado, uma pendência ou um retorno do cliente." />
      </label>
      <button className="btn secundario" type="submit">
        Adicionar nota
      </button>
    </FormAcao>
  );
}

export function FormAnexo({ processoId }: { processoId: string }) {
  return (
    <FormAcao acao={anexoAction}>
      <input type="hidden" name="processoId" value={processoId} />
      <label className="campo">
        <span>Arquivo (até 5 MB)</span>
        <input name="arquivo" type="file" required />
      </label>
      <button className="btn secundario" type="submit">
        Enviar anexo
      </button>
    </FormAcao>
  );
}

export function FormRemoverAnexo({ anexoId }: { anexoId: string }) {
  return (
    <FormAcao acao={removerAnexoAction}>
      <input type="hidden" name="anexoId" value={anexoId} />
      <button className="btn perigo" type="submit">
        Remover
      </button>
    </FormAcao>
  );
}

export function FormCliente({ valores, clienteId }: { valores?: Record<string, string>; clienteId?: string }) {
  const acao = clienteId ? salvarClienteAction : criarClienteAction;
  return (
    <FormAcao acao={acao} className="grade-form">
      {clienteId ? <input type="hidden" name="clienteId" value={clienteId} /> : null}
      <Campo nome="nome" rotulo="Razão social ou nome" valor={valores?.nome} className="largo" obrigatorio />
      <Campo nome="cnpj" rotulo="CNPJ" valor={valores?.cnpj} />
      <Campo nome="email" rotulo="E-mail" tipo="email" valor={valores?.email} />
      <Campo nome="telefone" rotulo="Telefone" valor={valores?.telefone} />
      <Campo nome="endereco" rotulo="Endereço" valor={valores?.endereco} className="largo" />
      <Campo nome="inscricaoEstadual" rotulo="Inscrição estadual" valor={valores?.inscricaoEstadual} />
      <Campo nome="site" rotulo="Site" valor={valores?.site} />
      <Campo nome="cidade" rotulo="Cidade" valor={valores?.cidade} />
      <Uf nome="uf" rotulo="UF" valor={valores?.uf} />
      <label className="campo largo">
        <span>Observações</span>
        <textarea name="observacoes" defaultValue={valores?.observacoes || ""} />
      </label>
      <div>
        <button className="btn primario" type="submit">
          {clienteId ? "Salvar cliente" : "Criar cliente"}
        </button>
      </div>
    </FormAcao>
  );
}

export function FormContato({ clienteId }: { clienteId: string }) {
  return (
    <FormAcao acao={criarContatoAction} className="grade-form">
      <input type="hidden" name="clienteId" value={clienteId} />
      <Campo nome="nome" rotulo="Nome" obrigatorio />
      <Campo nome="cargo" rotulo="Cargo" />
      <Campo nome="cpf" rotulo="CPF" />
      <Campo nome="documento" rotulo="Documento" />
      <Campo nome="email" rotulo="E-mail" tipo="email" />
      <Campo nome="telefone" rotulo="Telefone" />
      <label className="campo">
        <span>Contato principal</span>
        <input type="checkbox" name="principal" value="sim" />
      </label>
      <div>
        <button className="btn secundario" type="submit">
          Adicionar contato
        </button>
      </div>
    </FormAcao>
  );
}

export function FormUsuario() {
  return (
    <FormAcao acao={criarUsuarioAction} className="grade-form">
      <Campo nome="nome" rotulo="Nome" obrigatorio />
      <Campo nome="email" rotulo="E-mail" tipo="email" obrigatorio />
      <label className="campo">
        <span>Papel</span>
        <select name="papel" defaultValue="COMERCIAL">
          {PAPEIS.map((papel) => (
            <option key={papel.id} value={papel.id}>
              {papel.rotulo}
            </option>
          ))}
        </select>
      </label>
      <Campo nome="senha" rotulo="Senha inicial" tipo="text" obrigatorio />
      <div>
        <button className="btn primario" type="submit">
          Criar usuário
        </button>
      </div>
    </FormAcao>
  );
}

export function FormAlternarUsuario({ usuarioId, ativo }: { usuarioId: string; ativo: boolean }) {
  return (
    <FormAcao acao={alternarUsuarioAction}>
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="ativo" value={ativo ? "nao" : "sim"} />
      <button className="btn secundario" type="submit">
        {ativo ? "Desativar" : "Reativar"}
      </button>
    </FormAcao>
  );
}

export function FormChave() {
  return (
    <FormAcao acao={criarChaveAction}>
      <label className="campo">
        <span>Nome da integração</span>
        <input name="nome" required placeholder="Ex.: Agente de e-mail" />
      </label>
      <button className="btn primario" type="submit">
        Gerar chave
      </button>
    </FormAcao>
  );
}

export function FormRevogarChave({ chaveId }: { chaveId: string }) {
  return (
    <FormAcao acao={revogarChaveAction}>
      <input type="hidden" name="chaveId" value={chaveId} />
      <button className="btn perigo" type="submit">
        Revogar
      </button>
    </FormAcao>
  );
}

export type { EstadoForm };
