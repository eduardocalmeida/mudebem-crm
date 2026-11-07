"use client";

import { FormAcao } from "@/components/form-acao";
import {
  atribuirWhatsapp,
  enviarModeloWhatsapp,
  enviarTextoWhatsapp,
  salvarConfigWhatsapp,
  salvarNumeroWhatsapp,
  vincularWhatsapp,
} from "@/server/acoes-whatsapp";

export function FormResposta({ conversaId, janelaAberta }: { conversaId: string; janelaAberta: boolean }) {
  return (
    <div className="respostas">
      {janelaAberta ? (
        <FormAcao acao={enviarTextoWhatsapp}>
          <input type="hidden" name="conversaId" value={conversaId} />
          <label className="campo">
            <span>Resposta</span>
            <textarea name="texto" required placeholder="Escreva a mensagem para o cliente" />
          </label>
          <button className="btn primario" type="submit">
            Enviar
          </button>
        </FormAcao>
      ) : (
        <p className="alerta">A janela de 24 horas está fechada. Dá para enviar só um modelo aprovado pela Meta.</p>
      )}
      <FormAcao acao={enviarModeloWhatsapp}>
        <input type="hidden" name="conversaId" value={conversaId} />
        <div className="grade-form">
          <label className="campo">
            <span>Modelo aprovado</span>
            <input name="modelo" required placeholder="nome_do_modelo" />
          </label>
          <label className="campo">
            <span>Idioma</span>
            <input name="idioma" defaultValue="pt_BR" />
          </label>
          <label className="campo largo">
            <span>Parâmetros do corpo</span>
            <input name="parametros" placeholder="separados por |" />
          </label>
        </div>
        <button className="btn secundario" type="submit">
          Enviar modelo
        </button>
      </FormAcao>
    </div>
  );
}

export function FormAtribuir({
  conversaId,
  responsavelId,
  usuarios,
}: {
  conversaId: string;
  responsavelId: string;
  usuarios: { id: string; nome: string }[];
}) {
  return (
    <FormAcao acao={atribuirWhatsapp}>
      <input type="hidden" name="conversaId" value={conversaId} />
      <label className="campo">
        <span>Atribuir a</span>
        <select name="responsavelId" defaultValue={responsavelId}>
          <option value="">Ninguém</option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome}
            </option>
          ))}
        </select>
      </label>
      <button className="btn secundario" type="submit">
        Salvar atribuição
      </button>
    </FormAcao>
  );
}

export function FormVinculo({ conversaId, codigo }: { conversaId: string; codigo: string }) {
  return (
    <FormAcao acao={vincularWhatsapp}>
      <input type="hidden" name="conversaId" value={conversaId} />
      <label className="campo">
        <span>Processo (código ou id)</span>
        <input name="processo" defaultValue={codigo} placeholder="MB-2026-0001" />
      </label>
      <button className="btn secundario" type="submit">
        Ligar processo
      </button>
    </FormAcao>
  );
}

export function FormConfigWhatsapp({
  wabaId,
  appId,
  configId,
  apiVersion,
  travado,
}: {
  wabaId: string;
  appId: string;
  configId: string;
  apiVersion: string;
  travado: { verifyToken: boolean; appSecret: boolean; accessToken: boolean; waba: boolean; versao: boolean; appId: boolean; configId: boolean };
}) {
  return (
    <FormAcao acao={salvarConfigWhatsapp} className="grade-form">
      <label className="campo">
        <span>Verify token {travado.verifyToken ? "(vem do ambiente)" : ""}</span>
        <input name="verifyToken" type="password" autoComplete="off" disabled={travado.verifyToken} placeholder="deixe vazio para manter" />
      </label>
      <label className="campo">
        <span>App secret {travado.appSecret ? "(vem do ambiente)" : ""}</span>
        <input name="appSecret" type="password" autoComplete="off" disabled={travado.appSecret} placeholder="deixe vazio para manter" />
      </label>
      <label className="campo largo">
        <span>Token de acesso padrão {travado.accessToken ? "(vem do ambiente)" : ""}</span>
        <input name="accessToken" type="password" autoComplete="off" disabled={travado.accessToken} placeholder="deixe vazio para manter" />
      </label>
      <label className="campo">
        <span>App id {travado.appId ? "(vem do ambiente)" : ""}</span>
        <input name="appId" defaultValue={appId} disabled={travado.appId} />
      </label>
      <label className="campo">
        <span>Configuration id do Embedded Signup {travado.configId ? "(vem do ambiente)" : ""}</span>
        <input name="embeddedSignupConfigId" defaultValue={configId} disabled={travado.configId} />
      </label>
      <label className="campo">
        <span>WABA id</span>
        <input name="wabaId" defaultValue={wabaId} disabled={travado.waba} />
      </label>
      <label className="campo">
        <span>Versão da Graph API</span>
        <input name="apiVersion" defaultValue={apiVersion} disabled={travado.versao} />
      </label>
      <div>
        <button className="btn primario" type="submit">
          Salvar conexão
        </button>
      </div>
    </FormAcao>
  );
}

export function FormNumeroWhatsapp() {
  return (
    <FormAcao acao={salvarNumeroWhatsapp} className="grade-form">
      <label className="campo">
        <span>Nome interno</span>
        <input name="nome" required placeholder="Comercial" />
      </label>
      <label className="campo">
        <span>Phone number id</span>
        <input name="phoneNumberId" required />
      </label>
      <label className="campo">
        <span>Número de exibição</span>
        <input name="numeroExibicao" required placeholder="+55 11 3000-0000" />
      </label>
      <label className="campo">
        <span>Token deste número</span>
        <input name="accessToken" type="password" autoComplete="off" placeholder="opcional, se for diferente do padrão" />
      </label>
      <div>
        <button className="btn secundario" type="submit">
          Salvar número
        </button>
      </div>
    </FormAcao>
  );
}
