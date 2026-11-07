export const FUSO = "America/Sao_Paulo";

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export function hojeSaoPaulo(agora = new Date()): string {
  return diaSaoPaulo(agora);
}

export function diaSaoPaulo(valor: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(valor);
}

export function horaSaoPaulo(valor: Date): string {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(valor);
  const ler = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "00";
  return `${ler("hour")}:${ler("minute")}`;
}

export function vencimentoParaCampo(valor: Date): string {
  return `${diaSaoPaulo(valor)}T${horaSaoPaulo(valor)}`;
}

export function interpretarVencimento(valor: string): Date | null {
  const texto = valor.trim();
  if (!texto) return null;
  const brasileiro = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);
  if (brasileiro) {
    const data = new Date(`${brasileiro[3]}-${brasileiro[2]}-${brasileiro[1]}T${brasileiro[4] ?? "09"}:${brasileiro[5] ?? "00"}:00-03:00`);
    return Number.isNaN(data.getTime()) ? null : data;
  }
  const local = texto.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (local) {
    const data = new Date(`${local[1]}T${local[2]}:${local[3]}:${local[4] ?? "00"}-03:00`);
    return Number.isNaN(data.getTime()) ? null : data;
  }
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function adicionarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function interpretarData(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return null;
  const brasileira = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = brasileira ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}` : texto;
  return dataValida(iso) ? iso : null;
}

export function dataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function paraDataBanco(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00.000Z`);
}

export function dataParaIso(valor: Date | null | undefined): string | null {
  if (!valor) return null;
  return valor.toISOString().slice(0, 10);
}

export function formatarData(valor: Date | string | null | undefined): string {
  const iso = typeof valor === "string" ? valor.slice(0, 10) : dataParaIso(valor);
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(valor: Date | string): string {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export function diferencaDias(de: string, ate: string): number {
  const inicio = Date.parse(`${de}T00:00:00Z`);
  const fim = Date.parse(`${ate}T00:00:00Z`);
  return Math.round((fim - inicio) / 86_400_000);
}

export function textoQuando(iso: string | null, hoje = hojeSaoPaulo()): string {
  if (!iso) return "sem data";
  const delta = diferencaDias(hoje, iso);
  if (delta === 0) return "hoje";
  if (delta === 1) return "amanhã";
  if (delta === -1) return "ontem";
  if (delta > 1) return `em ${delta} dias`;
  return `há ${Math.abs(delta)} dias`;
}

export function saudacao(nome: string, agora = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: FUSO, hour: "numeric", hourCycle: "h23" }).format(agora),
  );
  const cumprimento = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiro = nome.trim().split(/\s+/)[0] ?? nome;
  return `${cumprimento}, ${primeiro}`;
}

export function formatarBRL(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function formatarNumero(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
}

export function digitosCnpjValidos(cnpj: string): boolean {
  const digitos = cnpj.replace(/\D/g, "");
  if (digitos.length !== 14 || /^(\d)\1+$/.test(digitos)) return false;
  const calcular = (base: string, fatores: number[]) => {
    const soma = fatores.reduce((total, fator, indice) => total + Number(base[indice]) * fator, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = calcular(digitos.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcular(digitos.slice(0, 12) + String(primeiro), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digitos.endsWith(`${primeiro}${segundo}`);
}

export function formatarCnpj(valor: string | null | undefined): string {
  if (!valor) return "—";
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length !== 14) return valor;
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function localidade(cidade: string | null | undefined, uf: string | null | undefined): string {
  if (cidade && uf) return `${cidade}/${uf}`;
  return cidade || uf || "Cidade não informada";
}

export function anoSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: FUSO, year: "numeric" }).format(agora);
}
