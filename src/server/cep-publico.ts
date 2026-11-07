export type EnderecoCep = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

type Buscar = (url: string, init?: RequestInit) => Promise<Response>;

function digitosCep(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 8);
}

export function formatarCep(valor: string) {
  const digitos = digitosCep(valor);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * A API oficial dos Correios (Token API / CWS) exige contrato e credencial.
 * Esta tarefa não grava segredo: a consulta usa o ViaCEP e, se ele falhar, a BrasilAPI.
 */
export async function consultarCep(cep: string, buscar: Buscar = fetch): Promise<EnderecoCep | null> {
  const digitos = digitosCep(cep);
  if (digitos.length !== 8) return null;
  const via = await peloViaCep(digitos, buscar);
  if (via) return via;
  return pelaBrasilApi(digitos, buscar);
}

async function peloViaCep(digitos: string, buscar: Buscar): Promise<EnderecoCep | null> {
  try {
    const resposta = await buscar(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: AbortSignal.timeout(4000),
      headers: { accept: "application/json" },
    });
    if (!resposta.ok) return null;
    const json = (await resposta.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (json.erro || !texto(json.uf)) return null;
    return {
      cep: formatarCep(digitos),
      logradouro: texto(json.logradouro),
      bairro: texto(json.bairro),
      cidade: texto(json.localidade),
      uf: texto(json.uf).toUpperCase(),
    };
  } catch {
    return null;
  }
}

async function pelaBrasilApi(digitos: string, buscar: Buscar): Promise<EnderecoCep | null> {
  try {
    const resposta = await buscar(`https://brasilapi.com.br/api/cep/v2/${digitos}`, {
      signal: AbortSignal.timeout(4000),
      headers: { accept: "application/json" },
    });
    if (!resposta.ok) return null;
    const json = (await resposta.json()) as { street?: string; neighborhood?: string; city?: string; state?: string };
    if (!texto(json.state)) return null;
    return {
      cep: formatarCep(digitos),
      logradouro: texto(json.street),
      bairro: texto(json.neighborhood),
      cidade: texto(json.city),
      uf: texto(json.state).toUpperCase(),
    };
  } catch {
    return null;
  }
}
