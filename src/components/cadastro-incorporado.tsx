"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (opcoes: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        retorno: (resposta: { authResponse?: { code?: string } }) => void,
        opcoes: Record<string, unknown>,
      ) => void;
    };
  }
}

export function CadastroIncorporado({
  appId,
  configId,
  versao,
}: {
  appId: string;
  configId: string;
  versao: string;
}) {
  const [coexistencia, setCoexistencia] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const dados = useRef({ phoneNumberId: "", wabaId: "", code: "", coexistencia: true, evento: "" });
  const enviado = useRef(false);
  dados.current.coexistencia = coexistencia;

  useEffect(() => {
    if (!appId) return;
    const iniciarSdk = () => window.FB?.init({ appId, cookie: true, xfbml: false, version: versao });
    window.fbAsyncInit = iniciarSdk;
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      document.body.appendChild(script);
    } else {
      iniciarSdk();
    }

    function ouvir(evento: MessageEvent) {
      if (!evento.origin.endsWith("facebook.com")) return;
      try {
        const corpo = typeof evento.data === "string" ? JSON.parse(evento.data) : evento.data;
        if (!corpo || corpo.type !== "WA_EMBEDDED_SIGNUP") return;
        const nome = String(corpo.event ?? "");
        if (nome === "CANCEL") {
          setMensagem("Cadastro cancelado.");
          return;
        }
        if (nome === "ERROR") {
          setErro("A Meta interrompeu o cadastro.");
          return;
        }
        dados.current.phoneNumberId = String(corpo.data?.phone_number_id ?? "");
        dados.current.wabaId = String(corpo.data?.waba_id ?? "");
        dados.current.evento = nome;
        void enviarSeCompleto();
      } catch {
        // Eventos da Meta que não são JSON ficam de fora.
      }
    }
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, [appId, versao]);

  async function enviarSeCompleto() {
    const atual = dados.current;
    if (!atual.code || !atual.phoneNumberId || !atual.wabaId || enviado.current) return;
    enviado.current = true;
    setEnviando(true);
    setErro(null);
    setMensagem("Conectando o número e pedindo o histórico…");
    const comApp = atual.coexistencia || atual.evento === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";
    try {
      const resposta = await fetch("/api/whatsapp/cadastro-incorporado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: atual.code,
          phoneNumberId: atual.phoneNumberId,
          wabaId: atual.wabaId,
          coexistencia: comApp,
        }),
      });
      const json = (await resposta.json()) as { erro?: string; coexistencia?: boolean };
      if (!resposta.ok) throw new Error(json.erro || "Não foi possível concluir o cadastro.");
      setMensagem(
        json.coexistencia
          ? "Número em coexistência. O histórico de até 180 dias foi pedido e chega pelo webhook."
          : "Número conectado à Cloud API.",
      );
    } catch (falha) {
      enviado.current = false;
      setMensagem(null);
      setErro(falha instanceof Error ? falha.message : "Falha no cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  function iniciar() {
    if (!window.FB) {
      setErro("O SDK da Meta ainda não carregou. Tente de novo em alguns segundos.");
      return;
    }
    setErro(null);
    setMensagem(null);
    enviado.current = false;
    dados.current = { phoneNumberId: "", wabaId: "", code: "", coexistencia, evento: "" };
    window.FB.login(
      (resposta) => {
        const code = resposta.authResponse?.code;
        if (!code) {
          setMensagem("A Meta não devolveu o código de autorização.");
          return;
        }
        dados.current.code = code;
        void enviarSeCompleto();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: "3",
          ...(coexistencia ? { featureType: "whatsapp_business_app_onboarding" } : {}),
        },
      },
    );
  }

  if (!appId || !configId) {
    return (
      <p className="alerta">
        Para o Embedded Signup, preencha o app id e o configuration id, ou defina WHATSAPP_APP_ID e WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID.
      </p>
    );
  }

  return (
    <div>
      <label className="campo">
        <span>
          <input type="checkbox" checked={coexistencia} onChange={(evento) => setCoexistencia(evento.target.checked)} />{" "}
          Coexistência: manter o aplicativo WhatsApp Business e usar a API no mesmo número
        </span>
      </label>
      <p className="muted">
        Desmarque para um número que será só da Cloud API. Com a coexistência, o CRM pede na hora o histórico de até 180 dias. A Meta só aceita esse pedido nas 24 horas seguintes, e a empresa precisa autorizar o compartilhamento na janela da Meta.
      </p>
      <button className="btn primario" type="button" onClick={iniciar} disabled={enviando}>
        {enviando ? "Conectando…" : "Conectar número com a Meta"}
      </button>
      {mensagem ? <p className="ok">{mensagem}</p> : null}
      {erro ? <p className="alerta">{erro}</p> : null}
    </div>
  );
}
