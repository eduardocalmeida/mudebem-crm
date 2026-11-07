import { Prisma } from "@prisma/client";

export type Faixa = {
  id?: string;
  volumeMin: Prisma.Decimal | number;
  volumeMax: Prisma.Decimal | number;
  kmMin: Prisma.Decimal | number;
  kmMax: Prisma.Decimal | number;
  precoPorKm: Prisma.Decimal | number;
};

const VOLUMES: [number, number][] = [
  [0, 20],
  [21, 45],
  [46, 60],
];
const DISTANCIAS: [number, number][] = [
  [0, 100],
  [101, 200],
  [201, 350],
  [351, 500],
  [501, 1000],
  [1001, 1500],
  [1501, 2500],
  [2501, 99999],
];
const PRECOS = [
  [65, 82, 104],
  [49, 62, 78],
  [36, 46, 58],
  [34.5, 43.5, 55],
  [17.25, 21.5, 27],
  [11.5, 14.5, 14.5],
  [10.5, 14, 14],
  [9.5, 13, 14],
];

export const FAIXAS_ATVOS = DISTANCIAS.flatMap(([kmMin, kmMax], linha) =>
  VOLUMES.map(([volumeMin, volumeMax], coluna) => ({
    volumeMin,
    volumeMax,
    kmMin,
    kmMax,
    precoPorKm: PRECOS[linha][coluna],
  })),
);

export type ResultadoPreco =
  | { semFaixa: true; motivo: string }
  | {
      semFaixa: false;
      precoPorKm: Prisma.Decimal;
      frete: Prisma.Decimal;
      seguro: Prisma.Decimal;
      total: Prisma.Decimal;
    };

export function calcularPrecoContrato(
  faixas: Faixa[],
  seguroPercentual: Prisma.Decimal | number,
  distanciaKm: Prisma.Decimal | number,
  volumeM3: Prisma.Decimal | number,
  valorDeclarado: Prisma.Decimal | number,
): ResultadoPreco {
  const km = new Prisma.Decimal(distanciaKm);
  const volume = new Prisma.Decimal(volumeM3);
  const declarado = new Prisma.Decimal(valorDeclarado);
  if (km.lt(0) || volume.lt(0) || declarado.lt(0)) {
    return { semFaixa: true, motivo: "Distância, volume e valor declarado não podem ser negativos." };
  }
  const matches = faixas.filter(
    (faixa) =>
      volume.gte(faixa.volumeMin) &&
      volume.lte(faixa.volumeMax) &&
      km.gte(faixa.kmMin) &&
      km.lte(faixa.kmMax),
  );
  if (matches.length !== 1) {
    return {
      semFaixa: true,
      motivo: "Sem faixa contratual – análise administrativa. Os limites são inclusivos e não há arredondamento entre faixas.",
    };
  }
  const precoPorKm = new Prisma.Decimal(matches[0].precoPorKm);
  const frete = precoPorKm.mul(km).toDecimalPlaces(2);
  const seguro = declarado.mul(seguroPercentual).toDecimalPlaces(2);
  return { semFaixa: false, precoPorKm, frete, seguro, total: frete.plus(seguro) };
}
