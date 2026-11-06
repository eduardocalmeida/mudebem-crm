import { prisma } from "@/lib/prisma";
import { FAIXAS_ATVOS } from "@/server/portal/preco";
import { garantirEtapas } from "@/server/etapas";

const UNIDADES = [
  ["Alto Taquari", "MT"],
  ["Caçu", "GO"],
  ["Costa Rica", "MS"],
  ["Mineiros", "GO"],
  ["Nova Alvorada do Sul", "MS"],
  ["Perolândia", "GO"],
  ["Rio Brilhante", "MS"],
  ["São Paulo — Matriz", "SP"],
  ["Teodoro Sampaio", "SP"],
] as const;

const PEDIDOS = [
  { protocolo: "MB-2026-000001", volume: 30.15, km: 1000, declarado: 50000, total: 22500, frete: 21500, seguro: 1000, preco: 21.5, data: "2026-08-17", nome: "Colaborador Atvos 1" },
  { protocolo: "MB-2026-000002", volume: 52.75, km: 954, declarado: 150000, total: 28758, frete: 25758, seguro: 3000, preco: 27, data: "2026-09-08", nome: "Colaborador Atvos 2" },
  { protocolo: "MB-2026-000003", volume: 48, km: 990, declarado: 100000, total: 28730, frete: 26730, seguro: 2000, preco: 27, data: "2026-09-10", nome: "Colaborador Atvos 3" },
];

export async function garantirPortalAtvos() {
  await garantirEtapas();
  const cliente = await prisma.cliente.upsert({
    where: { id: "cliente-atvos" },
    update: {},
    create: { id: "cliente-atvos", nome: "Atvos", cidade: "São Paulo", uf: "SP" },
  });
  const empresa = await prisma.empresaCliente.upsert({
    where: { slug: "atvos" },
    update: { nome: "Atvos", clienteId: cliente.id },
    create: { slug: "atvos", nome: "Atvos", razaoSocial: "ATVOS", clienteId: cliente.id },
  });
  for (const [nome, uf] of UNIDADES) {
    const existe = await prisma.unidadeEmpresa.findFirst({ where: { empresaId: empresa.id, nome } });
    if (!existe) await prisma.unidadeEmpresa.create({ data: { empresaId: empresa.id, nome, cidade: nome.replace(" — Matriz", ""), uf } });
  }
  let contrato = await prisma.contratoEmpresa.findFirst({ where: { empresaId: empresa.id, nome: "Contrato corporativo Atvos" } });
  if (!contrato) {
    contrato = await prisma.contratoEmpresa.create({
      data: { empresaId: empresa.id, nome: "Contrato corporativo Atvos", seguroPercentual: 0.02, ativo: true },
    });
  }
  if ((await prisma.faixaPreco.count({ where: { contratoId: contrato.id } })) < FAIXAS_ATVOS.length) {
    await prisma.faixaPreco.deleteMany({ where: { contratoId: contrato.id } });
    await prisma.faixaPreco.createMany({
      data: FAIXAS_ATVOS.map((faixa) => ({ contratoId: contrato.id, ...faixa })),
    });
  }
  for (const email of [
    ["colaborador@atvos.com.br", "Colaborador Atvos", "COLABORADOR"],
    ["gestor@atvos.com.br", "Gestor Atvos", "GESTOR"],
  ] as const) {
    await prisma.usuarioPortal.upsert({
      where: { empresaId_email: { empresaId: empresa.id, email: email[0] } },
      update: {},
      create: { empresaId: empresa.id, email: email[0], nome: email[1], papel: email[2] },
    });
  }
  const unidade = await prisma.unidadeEmpresa.findFirst({ where: { empresaId: empresa.id, nome: "Costa Rica" } });
  const gestor = await prisma.usuarioPortal.findFirst({ where: { empresaId: empresa.id, email: "gestor@atvos.com.br" } });
  for (const pedido of PEDIDOS) {
    if (await prisma.solicitacaoPortal.findUnique({ where: { protocolo: pedido.protocolo } })) continue;
    const processo = await prisma.processo.create({
      data: {
        codigo: pedido.protocolo,
        titulo: `Mudança contratual ${pedido.nome}`,
        etapa: "A_EXECUTAR",
        canal: "SITE",
        clienteId: cliente.id,
        colaborador: pedido.nome,
        origemCidade: "Goiânia",
        origemUf: "GO",
        destinoCidade: "Goiânia",
        destinoUf: "GO",
        volume: `${pedido.volume.toFixed(2).replace(".", ",")} m³`,
        valorAprovado: pedido.total,
        valorCotado: pedido.total,
        dataPretendida: new Date(`${pedido.data}T00:00:00.000Z`),
        etiqueta: "Contrato Atvos",
        aprovacaoPortal: "PENDENTE",
        contratoEmpresaId: contrato.id,
        inventario: "Pedido importado do portal anterior. O snapshot de preço histórico era nulo; o total abaixo é o valor já gravado na solicitação, não uma reconstrução de itens.",
      },
    });
    await prisma.solicitacaoPortal.create({
      data: {
        protocolo: pedido.protocolo,
        empresaId: empresa.id,
        contratoId: contrato.id,
        unidadeId: unidade?.id,
        usuarioId: gestor?.id,
        nome: pedido.nome,
        cpf: "00000000000",
        email: "gestor@atvos.com.br",
        telefone: "(11) 99999-9999",
        dataPrevista: new Date(`${pedido.data}T00:00:00.000Z`),
        origemCidade: "Goiânia",
        origemUf: "GO",
        destinoCidade: "Goiânia",
        destinoUf: "GO",
        distanciaKm: pedido.km,
        volumeM3: pedido.volume,
        valorDeclarado: pedido.declarado,
        precoPorKm: pedido.preco,
        frete: pedido.frete,
        seguro: pedido.seguro,
        total: pedido.total,
        status: "ENVIADA",
        processoId: processo.id,
        itens: [],
      },
    });
  }
  return { empresaId: empresa.id, contratoId: contrato.id };
}
