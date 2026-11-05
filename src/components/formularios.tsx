"use client";

import { useMemo, useState } from "react";
import { CANAIS, PAPEIS, type Campo, type Etapa } from "@/lib/domain";
import { UFS } from "@/lib/format";
import type { EstadoForm } from "@/lib/estado";
import {
  anexoAction,
  criarChaveAction,
  criarClienteAction,
  criarContatoAction,
  criarProcessoAction,
  criarUsuarioAction,
  mudarEtapaAction,
  notaAction,
  removerAnexoAction,
  revogarChaveAction,
  salvarClienteAction,
  salvarProcessoAction,
  alternarUsuarioAction,
} from "@/server/actions";
import { FormAcao } from "@/components/form-acao";

type ContatoOpcao = { id: string; nome: string };
type ClienteOpcao = { id: string; nome: string; contatos: ContatoOpcao[] };
type UsuarioOpcao = { id: string; nome: string };
type Valores = Partial<Record<Campo, string>>;

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

  return (
    <FormAcao acao={acao} className="grade-form">
      {processoId ? <input type="hidden" name="processoId" value={processoId} /> : null}
      {mostra("titulo") ? <Campo nome="titulo" rotulo="Título" valor={valores?.titulo} className="largo" obrigatorio /> : null}
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
        <label className="campo">
          <span>Contato</span>
          <select key={clienteId} name="contatoId" defaultValue={valores?.contatoId || ""}>
            <option value="">Sem contato definido</option>
            {contatos.map((contato) => (
              <option key={contato.id} value={contato.id}>
                {contato.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {mostra("colaborador") ? <Campo nome="colaborador" rotulo="Colaborador em mudança" valor={valores?.colaborador} /> : null}
      {mostra("responsavelId") ? (
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
      {mostra("origemEndereco") ? <Campo nome="origemEndereco" rotulo="Endereço de origem" valor={valores?.origemEndereco} className="largo" /> : null}
      {mostra("origemCidade") ? <Campo nome="origemCidade" rotulo="Cidade de origem" valor={valores?.origemCidade} /> : null}
      {mostra("origemUf") ? <Uf nome="origemUf" rotulo="UF de origem" valor={valores?.origemUf} /> : null}
      {mostra("origemReferencia") ? <Campo nome="origemReferencia" rotulo="Ponto de referência de origem" valor={valores?.origemReferencia} /> : null}
      {mostra("origemAndar") ? <Campo nome="origemAndar" rotulo="Andar de origem" valor={valores?.origemAndar} /> : null}
      {mostra("origemElevador") ? <Campo nome="origemElevador" rotulo="Elevador de origem" valor={valores?.origemElevador} /> : null}
      {mostra("origemImovel") ? <Campo nome="origemImovel" rotulo="Imóvel de origem" valor={valores?.origemImovel} /> : null}
      {mostra("destinoEndereco") ? <Campo nome="destinoEndereco" rotulo="Endereço de destino" valor={valores?.destinoEndereco} className="largo" /> : null}
      {mostra("destinoCidade") ? <Campo nome="destinoCidade" rotulo="Cidade de destino" valor={valores?.destinoCidade} /> : null}
      {mostra("destinoUf") ? <Uf nome="destinoUf" rotulo="UF de destino" valor={valores?.destinoUf} /> : null}
      {mostra("destinoReferencia") ? <Campo nome="destinoReferencia" rotulo="Ponto de referência de destino" valor={valores?.destinoReferencia} /> : null}
      {mostra("destinoAndar") ? <Campo nome="destinoAndar" rotulo="Andar de destino" valor={valores?.destinoAndar} /> : null}
      {mostra("destinoElevador") ? <Campo nome="destinoElevador" rotulo="Elevador de destino" valor={valores?.destinoElevador} /> : null}
      {mostra("destinoImovel") ? <Campo nome="destinoImovel" rotulo="Imóvel de destino" valor={valores?.destinoImovel} /> : null}
      {mostra("modalidade") ? <Campo nome="modalidade" rotulo="Modalidade" valor={valores?.modalidade} /> : null}
      {mostra("descricaoColeta") ? <Campo nome="descricaoColeta" rotulo="Coleta" valor={valores?.descricaoColeta} /> : null}
      {mostra("descricaoEntrega") ? <Campo nome="descricaoEntrega" rotulo="Entrega" valor={valores?.descricaoEntrega} /> : null}
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
      {mostra("volume") ? <Campo nome="volume" rotulo="Volume" valor={valores?.volume} /> : null}
      {mostra("itensEspeciais") ? <Campo nome="itensEspeciais" rotulo="Itens especiais" valor={valores?.itensEspeciais} className="largo" /> : null}
      {mostra("dataPretendida") ? <Campo nome="dataPretendida" rotulo="Data pretendida" tipo="date" valor={valores?.dataPretendida} /> : null}
      {mostra("dataColeta") ? <Campo nome="dataColeta" rotulo="Data da coleta" tipo="date" valor={valores?.dataColeta} /> : null}
      {mostra("dataEntrega") ? <Campo nome="dataEntrega" rotulo="Data da entrega" tipo="date" valor={valores?.dataEntrega} /> : null}
      {mostra("dataPrevista") ? <Campo nome="dataPrevista" rotulo="Data prevista" tipo="date" valor={valores?.dataPrevista} /> : null}
      {mostra("dataEmissao") ? <Campo nome="dataEmissao" rotulo="Data de emissão" tipo="date" valor={valores?.dataEmissao} /> : null}
      {mostra("diasParaColetar") ? <Campo nome="diasParaColetar" rotulo="Dias para coletar" valor={valores?.diasParaColetar} /> : null}
      {mostra("diasParaViagem") ? <Campo nome="diasParaViagem" rotulo="Dias para viagem" valor={valores?.diasParaViagem} /> : null}
      {mostra("motoristaNome") ? <Campo nome="motoristaNome" rotulo="Motorista" valor={valores?.motoristaNome} /> : null}
      {mostra("motoristaPlaca") ? <Campo nome="motoristaPlaca" rotulo="Placa" valor={valores?.motoristaPlaca} /> : null}
      {mostra("motoristaAntt") ? <Campo nome="motoristaAntt" rotulo="ANTT" valor={valores?.motoristaAntt} /> : null}
      {mostra("motoristaCnh") ? <Campo nome="motoristaCnh" rotulo="CNH" valor={valores?.motoristaCnh} /> : null}
      {mostra("motoristaCpf") ? <Campo nome="motoristaCpf" rotulo="CPF do motorista" valor={valores?.motoristaCpf} /> : null}
      {mostra("inventario") ? (
        <label className="campo largo">
          <span>Inventário e observações</span>
          <textarea name="inventario" defaultValue={valores?.inventario || ""} />
        </label>
      ) : null}
      {mostra("valorCotado") ? <Campo nome="valorCotado" rotulo="Valor cotado (R$)" valor={valores?.valorCotado} /> : null}
      {mostra("valorAprovado") ? <Campo nome="valorAprovado" rotulo="Valor aprovado (R$)" valor={valores?.valorAprovado} /> : null}
      {mostra("valorFrete") ? <Campo nome="valorFrete" rotulo="Valor do frete (R$)" valor={valores?.valorFrete} /> : null}
      {mostra("valorSeguro") ? <Campo nome="valorSeguro" rotulo="Valor do seguro (R$)" valor={valores?.valorSeguro} /> : null}
      {mostra("valorTransporte") ? <Campo nome="valorTransporte" rotulo="Valor do transporte (R$)" valor={valores?.valorTransporte} /> : null}
      {mostra("valorTotal") ? <Campo nome="valorTotal" rotulo="Valor total (R$)" valor={valores?.valorTotal} /> : null}
      {mostra("formaPagamento") ? <Campo nome="formaPagamento" rotulo="Forma de pagamento" valor={valores?.formaPagamento} /> : null}
      {mostra("validadeProposta") ? <Campo nome="validadeProposta" rotulo="Validade da proposta" tipo="date" valor={valores?.validadeProposta} /> : null}
      {mostra("linkProposta") ? <Campo nome="linkProposta" rotulo="Link da proposta" valor={valores?.linkProposta} /> : null}
      {mostra("linkContrato") ? <Campo nome="linkContrato" rotulo="Link do contrato" valor={valores?.linkContrato} /> : null}
      {mostra("linkContratoCarreteiro") ? <Campo nome="linkContratoCarreteiro" rotulo="Link do contrato do carreteiro" valor={valores?.linkContratoCarreteiro} /> : null}
      {mostra("linkOs") ? <Campo nome="linkOs" rotulo="Link da O.S." valor={valores?.linkOs} /> : null}
      {mostra("linkRecibo") ? <Campo nome="linkRecibo" rotulo="Link do recibo" valor={valores?.linkRecibo} /> : null}
      {mostra("fonte") ? <Campo nome="fonte" rotulo="Fonte" valor={valores?.fonte} /> : null}
      {mostra("numeroOc") ? <Campo nome="numeroOc" rotulo="Ordem de compra (OC)" valor={valores?.numeroOc} /> : null}
      {mostra("numeroCte") ? <Campo nome="numeroCte" rotulo="CT-e" valor={valores?.numeroCte} /> : null}
      {mostra("numeroNf") ? <Campo nome="numeroNf" rotulo="NF / fatura" valor={valores?.numeroNf} /> : null}
      {mostra("dataVencimento") ? <Campo nome="dataVencimento" rotulo="Vencimento" tipo="date" valor={valores?.dataVencimento} /> : null}
      {mostra("dataRecebimento") ? <Campo nome="dataRecebimento" rotulo="Recebimento" tipo="date" valor={valores?.dataRecebimento} /> : null}
      <div className="largo">
        <button className="btn primario" type="submit">
          {modo === "criar" ? "Criar processo" : "Salvar alterações"}
        </button>
      </div>
    </FormAcao>
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
        type={tipo === "date" ? "text" : tipo}
        inputMode={tipo === "date" ? "numeric" : undefined}
        placeholder={tipo === "date" ? "dd/mm/aaaa" : undefined}
        defaultValue={valor || ""}
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

export function FormEtapa({ processoId, destinos }: { processoId: string; destinos: { id: Etapa; rotulo: string }[] }) {
  if (destinos.length === 0) {
    return <p className="muted">Seu papel não move este processo a partir da etapa atual. Um administrador pode corrigir.</p>;
  }
  return (
    <FormAcao acao={mudarEtapaAction}>
      <input type="hidden" name="processoId" value={processoId} />
      <label className="campo">
        <span>Nova etapa</span>
        <select name="etapa" defaultValue="" required>
          <option value="" disabled>
            Escolha a etapa
          </option>
          {destinos.map((etapa) => (
            <option key={etapa.id} value={etapa.id}>
              {etapa.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Observação da mudança</span>
        <textarea name="observacao" placeholder="Opcional" />
      </label>
      <button className="btn primario" type="submit">
        Mover etapa
      </button>
    </FormAcao>
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
