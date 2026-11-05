import { prisma } from "@/lib/prisma";

export type SegredosWhatsapp = {
  verifyToken: string | null;
  appSecret: string | null;
  accessToken: string | null;
  wabaId: string | null;
  apiVersion: string;
  verifyTokenNoAmbiente: boolean;
  appSecretNoAmbiente: boolean;
  accessTokenNoAmbiente: boolean;
};

function limpo(valor: string | undefined): string | null {
  const texto = valor?.trim();
  return texto ? texto : null;
}

export function numerosDoAmbiente() {
  const numeros: { nome: string; phoneNumberId: string; numeroExibicao: string; accessToken: string | null }[] = [];
  for (let indice = 1; indice <= 5; indice += 1) {
    const phoneNumberId = limpo(process.env[`WHATSAPP_NUMERO_${indice}_ID`]);
    if (!phoneNumberId) continue;
    numeros.push({
      phoneNumberId,
      nome: limpo(process.env[`WHATSAPP_NUMERO_${indice}_NOME`]) ?? `Número ${indice}`,
      numeroExibicao: limpo(process.env[`WHATSAPP_NUMERO_${indice}_EXIBICAO`]) ?? phoneNumberId,
      accessToken: limpo(process.env[`WHATSAPP_NUMERO_${indice}_TOKEN`]),
    });
  }
  return numeros;
}

export async function sincronizarNumerosDoAmbiente() {
  for (const numero of numerosDoAmbiente()) {
    await prisma.numeroWhatsapp.upsert({
      where: { phoneNumberId: numero.phoneNumberId },
      update: {
        nome: numero.nome,
        numeroExibicao: numero.numeroExibicao,
        ...(numero.accessToken ? { accessToken: numero.accessToken } : {}),
        ativo: true,
      },
      create: numero,
    });
  }
}

export async function segredosWhatsapp(): Promise<SegredosWhatsapp> {
  const config = await prisma.configWhatsapp.upsert({
    where: { id: "padrao" },
    update: {},
    create: { id: "padrao" },
  });
  const verifyTokenEnv = limpo(process.env.WHATSAPP_VERIFY_TOKEN);
  const appSecretEnv = limpo(process.env.WHATSAPP_APP_SECRET);
  const accessTokenEnv = limpo(process.env.WHATSAPP_ACCESS_TOKEN);
  const wabaEnv = limpo(process.env.WHATSAPP_WABA_ID);
  return {
    verifyToken: verifyTokenEnv ?? config.verifyToken,
    appSecret: appSecretEnv ?? config.appSecret,
    accessToken: accessTokenEnv ?? config.accessToken,
    wabaId: wabaEnv ?? config.wabaId,
    apiVersion: limpo(process.env.WHATSAPP_API_VERSION) ?? config.apiVersion ?? "v21.0",
    verifyTokenNoAmbiente: Boolean(verifyTokenEnv),
    appSecretNoAmbiente: Boolean(appSecretEnv),
    accessTokenNoAmbiente: Boolean(accessTokenEnv),
  };
}

export function tokenDoNumero(
  numero: { accessToken: string | null },
  segredos: SegredosWhatsapp,
): string | null {
  return numero.accessToken || segredos.accessToken;
}
