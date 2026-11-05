import { createHmac, timingSafeEqual } from "crypto";

export const JANELA_MS = 24 * 60 * 60 * 1000;

export function assinaturaValida(corpo: string, cabecalho: string | null, segredo: string): boolean {
  if (!cabecalho?.startsWith("sha256=")) return false;
  const recebido = cabecalho.slice("sha256=".length).trim();
  const esperado = createHmac("sha256", segredo).update(corpo).digest("hex");
  if (recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
}

export function assinarCorpo(corpo: string, segredo: string): string {
  return `sha256=${createHmac("sha256", segredo).update(corpo).digest("hex")}`;
}

export function dentroDaJanela(ultimaEntrada: Date | null | undefined, agora = new Date()): boolean {
  if (!ultimaEntrada) return false;
  return agora.getTime() - ultimaEntrada.getTime() < JANELA_MS;
}

export function digitosTelefone(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

export function formatarWaId(waId: string): string {
  const digitos = digitosTelefone(waId);
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    const ddd = digitos.slice(2, 4);
    const resto = digitos.slice(4);
    if (resto.length === 9) return `+55 (${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
    return `+55 (${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  }
  return digitos ? `+${digitos}` : waId;
}

export type TipoMensagem =
  | "TEXTO"
  | "IMAGEM"
  | "AUDIO"
  | "VIDEO"
  | "DOCUMENTO"
  | "FIGURINHA"
  | "LOCALIZACAO"
  | "MODELO"
  | "INTERATIVA"
  | "DESCONHECIDO";

export type StatusMensagem = "RECEBIDA" | "ENVIADA" | "ENTREGUE" | "LIDA" | "FALHOU";

const TIPOS: Record<string, TipoMensagem> = {
  text: "TEXTO",
  image: "IMAGEM",
  audio: "AUDIO",
  video: "VIDEO",
  document: "DOCUMENTO",
  sticker: "FIGURINHA",
  location: "LOCALIZACAO",
  template: "MODELO",
  interactive: "INTERATIVA",
  button: "INTERATIVA",
};

export function tipoDaMensagem(tipo: string | undefined): TipoMensagem {
  if (!tipo) return "DESCONHECIDO";
  return TIPOS[tipo] ?? "DESCONHECIDO";
}

export function statusDaMeta(status: string | undefined): StatusMensagem | null {
  if (status === "sent") return "ENVIADA";
  if (status === "delivered") return "ENTREGUE";
  if (status === "read") return "LIDA";
  if (status === "failed") return "FALHOU";
  return null;
}

type MidiaMeta = { id?: string; mime_type?: string; caption?: string; filename?: string };

export type MensagemInterpretada = {
  wamid: string | null;
  de: string | null;
  quando: Date;
  tipo: TipoMensagem;
  texto: string | null;
  midiaId: string | null;
  midiaMime: string | null;
  midiaNome: string | null;
};

function quandoUnix(valor: string | undefined): Date {
  const segundos = Number(valor);
  if (!Number.isFinite(segundos) || segundos <= 0) return new Date();
  return new Date(segundos * 1000);
}

function midia(bloco: MidiaMeta | undefined) {
  return {
    midiaId: bloco?.id ?? null,
    midiaMime: bloco?.mime_type ?? null,
    midiaNome: bloco?.filename ?? null,
    legenda: bloco?.caption?.trim() || null,
  };
}

export function interpretarMensagem(bruta: Record<string, unknown>): MensagemInterpretada {
  const tipoMeta = typeof bruta.type === "string" ? bruta.type : undefined;
  const tipo = tipoDaMensagem(tipoMeta);
  const quando = quandoUnix(typeof bruta.timestamp === "string" ? bruta.timestamp : undefined);
  const wamid = typeof bruta.id === "string" ? bruta.id : null;
  const de = typeof bruta.from === "string" ? digitosTelefone(bruta.from) : null;
  let texto: string | null = null;
  let anexo = { midiaId: null as string | null, midiaMime: null as string | null, midiaNome: null as string | null };

  if (tipo === "TEXTO") {
    const bloco = bruta.text as { body?: string } | undefined;
    texto = bloco?.body?.trim() || null;
  } else if (tipo === "IMAGEM" || tipo === "AUDIO" || tipo === "VIDEO" || tipo === "DOCUMENTO" || tipo === "FIGURINHA") {
    const chave = tipoMeta && typeof bruta[tipoMeta] === "object" ? (bruta[tipoMeta] as MidiaMeta) : undefined;
    const dados = midia(chave);
    anexo = dados;
    texto = dados.legenda;
  } else if (tipo === "LOCALIZACAO") {
    const local = bruta.location as { latitude?: number; longitude?: number; name?: string } | undefined;
    texto = local ? `Localização: ${local.latitude ?? ""}, ${local.longitude ?? ""} ${local.name ?? ""}`.trim() : "Localização";
  } else if (tipo === "INTERATIVA") {
    const interativa = bruta.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } } | undefined;
    const botao = bruta.button as { text?: string } | undefined;
    texto = interativa?.button_reply?.title || interativa?.list_reply?.title || botao?.text || "Mensagem interativa";
  } else {
    texto = tipoMeta ? `Mensagem do tipo ${tipoMeta}` : null;
  }

  return { wamid, de, quando, tipo, texto, ...anexo };
}

export function rotuloTipo(tipo: TipoMensagem): string {
  const mapa: Record<TipoMensagem, string> = {
    TEXTO: "Texto",
    IMAGEM: "Imagem",
    AUDIO: "Áudio",
    VIDEO: "Vídeo",
    DOCUMENTO: "Documento",
    FIGURINHA: "Figurinha",
    LOCALIZACAO: "Localização",
    MODELO: "Modelo",
    INTERATIVA: "Interativa",
    DESCONHECIDO: "Mensagem",
  };
  return mapa[tipo];
}
