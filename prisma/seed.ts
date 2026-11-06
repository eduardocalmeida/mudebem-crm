import { PrismaClient, type CanalOrigem } from "@prisma/client";
import { CHAVE_API_EXEMPLO, hashChave } from "../src/lib/api-key";
import { adicionarDias, digitosCnpjValidos, hojeSaoPaulo, paraDataBanco } from "../src/lib/format";
import { hashSenha } from "../src/lib/password";
import { CATALOGO_MUDANCA, REGRAS_TAREFA, TIPOS_TAREFA } from "../src/server/catalogo-mudanca";

const prisma = new PrismaClient();
const SENHA = "MudeBem@2026";

function cnpj(base12: string) {
  const calcular = (base: string, fatores: number[]) => {
    const soma = fatores.reduce((total, fator, indice) => total + Number(base[indice]) * fator, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = calcular(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcular(base12 + String(primeiro), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const numero = `${base12}${primeiro}${segundo}`;
  if (!digitosCnpjValidos(numero)) throw new Error(`CNPJ inválido gerado: ${numero}`);
  return numero;
}

function dia(iso: string) {
  return paraDataBanco(iso)!;
}

function quando(iso: string, hora: string) {
  return new Date(`${iso}T${hora}-03:00`);
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_CONFIRM !== "sim") {
    throw new Error("Seed recusado em produção. Defina SEED_CONFIRM=sim para recriar os dados de exemplo.");
  }

  const hoje = hojeSaoPaulo();
  const senhaHash = await hashSenha(SENHA);

  await prisma.conversaWhatsapp.deleteMany({ where: { exemplo: true } });
  await prisma.numeroWhatsapp.deleteMany({ where: { exemplo: true } });
  await prisma.processo.deleteMany({ where: { exemplo: true } });
  try {
    await prisma.cliente.deleteMany({ where: { exemplo: true } });
  } catch {
    throw new Error("Há processos reais ligados a clientes de exemplo. Remova esses processos antes de rodar o seed.");
  }
  await prisma.chaveApi.deleteMany({ where: { exemplo: true } });

  const [ana, bruno, carla, diego] = await Promise.all(
    [
      ["Ana Costa", "ana.costa@mudebem.com.br", "ADMIN"],
      ["Bruno Lima", "bruno.lima@mudebem.com.br", "COMERCIAL"],
      ["Carla Nunes", "carla.nunes@mudebem.com.br", "OPERACAO"],
      ["Diego Ramos", "diego.ramos@mudebem.com.br", "FINANCEIRO"],
      ["Elena Martins", "elena.martins@mudebem.com.br", "COMERCIAL"],
      ["Felipe Rocha", "felipe.rocha@mudebem.com.br", "COMERCIAL"],
      ["Gabriela Souza", "gabriela.souza@mudebem.com.br", "OPERACAO"],
      ["Henrique Dias", "henrique.dias@mudebem.com.br", "FINANCEIRO"],
    ].map(([nome, email, papel]) =>
      prisma.usuario.upsert({
        where: { email },
        update: { nome, papel: papel as "ADMIN", senhaHash, ativo: true },
        create: { nome, email, papel: papel as "ADMIN", senhaHash },
      }),
    ),
  );

  const empresas = [
    ["TechNova Sistemas Ltda", cnpj("123456780001"), "contato@technova.com.br", "(11) 3120-4400", "Av. Brigadeiro Faria Lima, 3400", "São Paulo", "SP"],
    ["Banco Horizonte S.A.", cnpj("234567890001"), "rh@bancohorizonte.com.br", "(21) 3232-9000", "Av. Rio Branco, 120", "Rio de Janeiro", "RJ"],
    ["Grupo Aurora Alimentos", cnpj("345678900001"), "gente@auroraalimentos.com.br", "(41) 3333-1212", "Rua XV de Novembro, 800", "Curitiba", "PR"],
    ["Indústria Vale Verde Ltda", cnpj("456789010001"), "facilities@valeverde.ind.br", "(16) 3622-1010", "Rod. Anhanguera, km 312", "Ribeirão Preto", "SP"],
    ["Química Sul do Brasil Ltda", cnpj("567890120001"), "suprimentos@quimicasul.com.br", "(13) 3228-7700", "Av. Conselheiro Nébias, 540", "Santos", "SP"],
    ["Consultoria Leme & Associados", cnpj("678901230001"), "contato@lemeassociados.com.br", "(31) 3291-4040", "Av. Afonso Pena, 1500", "Belo Horizonte", "MG"],
    ["Rede Clínica Aurora", cnpj("789012340001"), "expansao@clinicaaurora.com.br", "(19) 3254-8080", "Rua Dr. Quirino, 880", "Campinas", "SP"],
    ["Nimbus Escritórios Compartilhados", cnpj("890123450001"), "operacoes@nimbus.work", "(11) 4118-2200", "Rua dos Pinheiros, 498", "São Paulo", "SP"],
  ] as const;

  const clientes = new Map<string, { id: string }>();
  for (const [nome, cnpjNumero, email, telefone, endereco, cidade, uf] of empresas) {
    const cliente = await prisma.cliente.create({
      data: {
        nome,
        cnpj: cnpjNumero,
        email,
        telefone,
        endereco,
        cidade,
        uf,
        exemplo: true,
        observacoes: "Cadastro de exemplo gerado pelo seed. Pode ser excluído.",
      },
    });
    clientes.set(nome, cliente);
  }

  async function contato(cliente: string, nome: string, email: string, telefone: string, cargo: string, principal = true) {
    return prisma.contato.create({
      data: { clienteId: clientes.get(cliente)!.id, nome, email, telefone, cargo, principal },
    });
  }

  const marina = await contato("TechNova Sistemas Ltda", "Marina Alves", "marina.alves@technova.com.br", "(11) 98821-3344", "Analista de gente e gestão");
  const ricardo = await contato("Banco Horizonte S.A.", "Ricardo Pacheco", "ricardo.pacheco@bancohorizonte.com.br", "(21) 99710-2201", "Coordenador de RH");
  const helena = await contato("Grupo Aurora Alimentos", "Helena Duarte", "helena.duarte@auroraalimentos.com.br", "(41) 98400-1188", "Business partner de RH");
  const otavio = await contato("Indústria Vale Verde Ltda", "Otávio Mendes", "otavio.mendes@valeverde.ind.br", "(16) 99120-4455", "Gerente de facilities");
  const lucia = await contato("Química Sul do Brasil Ltda", "Lúcia Ferreira", "lucia.ferreira@quimicasul.com.br", "(13) 99654-7781", "Compradora");
  const paulo = await contato("Consultoria Leme & Associados", "Paulo Leme", "paulo.leme@lemeassociados.com.br", "(31) 98877-0909", "Sócio");
  const renata = await contato("Rede Clínica Aurora", "Renata Campos", "renata.campos@clinicaaurora.com.br", "(19) 99741-6262", "Gerente de expansão");
  const caio = await contato("Nimbus Escritórios Compartilhados", "Caio Ventura", "caio.ventura@nimbus.work", "(11) 97320-4410", "Operações");
  await contato("Banco Horizonte S.A.", "Fernanda Ruiz", "fernanda.ruiz@bancohorizonte.com.br", "(21) 98800-4412", "Analista de facilities", false);

  type Item = {
    codigo: string;
    titulo: string;
    etapa: string;
    canal: CanalOrigem;
    cliente: string;
    contatoId: string;
    colaborador: string;
    origemEndereco: string;
    origemCidade: string;
    origemUf: string;
    destinoEndereco: string;
    destinoCidade: string;
    destinoUf: string;
    coleta?: number;
    entrega?: number;
    inventario: string;
    valorCotado?: number;
    valorAprovado?: number;
    numeroOc?: string;
    numeroCte?: string;
    numeroNf?: string;
    vencimento?: number;
    recebimento?: number;
    responsavelId: string;
    nota?: string;
    criadoHa: number;
  };

  const itens: Item[] = [
    {
      codigo: "MB-EX-0001",
      titulo: "Mudança residencial da analista Marina Alves",
      etapa: "LEADS_DE_ENTRADA",
      canal: "WHATSAPP",
      cliente: "TechNova Sistemas Ltda",
      contatoId: marina.id,
      colaborador: "Marina Alves",
      origemEndereco: "Rua Harmonia, 412, apto 73, Vila Madalena",
      origemCidade: "São Paulo",
      origemUf: "SP",
      destinoEndereco: "Rua Barão de Jaguara, 950, apto 12, Centro",
      destinoCidade: "Campinas",
      destinoUf: "SP",
      coleta: 5,
      entrega: 6,
      inventario: "Apartamento de 3 dormitórios. Sofá, mesa de 6 lugares, cama queen, home office e cerca de 40 caixas. Elevador nos dois endereços.",
      valorCotado: 18400,
      responsavelId: bruno.id,
      nota: "Lead chegou pelo WhatsApp corporativo. A colaboradora foi transferida para a unidade de Campinas.",
      criadoHa: 1,
    },
    {
      codigo: "MB-EX-0002",
      titulo: "Transferência do gerente Ricardo Pacheco",
      etapa: "PRECIFICACAO",
      canal: "SITE",
      cliente: "Banco Horizonte S.A.",
      contatoId: ricardo.id,
      colaborador: "Ricardo Pacheco",
      origemEndereco: "Rua Visconde de Pirajá, 280, apto 901, Ipanema",
      origemCidade: "Rio de Janeiro",
      origemUf: "RJ",
      destinoEndereco: "Rua da Bahia, 1200, apto 54, Lourdes",
      destinoCidade: "Belo Horizonte",
      destinoUf: "MG",
      inventario: "Mudança interestadual com piano digital, adega e acervo de cerca de 30 caixas de livros. Aguardando vistoria virtual para fechar o preço.",
      responsavelId: bruno.id,
      criadoHa: 3,
    },
    {
      codigo: "MB-EX-0003",
      titulo: "Abertura do escritório regional Sul",
      etapa: "PROPOSTA",
      canal: "EMAIL",
      cliente: "Grupo Aurora Alimentos",
      contatoId: helena.id,
      colaborador: "Equipe comercial Sul (6 pessoas)",
      origemEndereco: "Rua XV de Novembro, 800, 4º andar",
      origemCidade: "Curitiba",
      origemUf: "PR",
      destinoEndereco: "Av. Independência, 700, sala 41, Independência",
      destinoCidade: "Porto Alegre",
      destinoUf: "RS",
      coleta: 3,
      entrega: 5,
      inventario: "12 estações de trabalho, 2 salas de reunião, arquivo deslizante e copa. Proposta enviada com janela de coleta em dia útil.",
      valorCotado: 27800,
      responsavelId: bruno.id,
      nota: "Proposta PDF enviada por e-mail. O RH pediu para manter a sexta-feira livre de coleta.",
      criadoHa: 6,
    },
    {
      codigo: "MB-EX-0004",
      titulo: "Mudança da diretoria industrial",
      etapa: "NEGOCIACAO",
      canal: "INDICACAO",
      cliente: "Indústria Vale Verde Ltda",
      contatoId: otavio.id,
      colaborador: "Diretoria industrial",
      origemEndereco: "Rod. Anhanguera, km 312, casa 2",
      origemCidade: "Ribeirão Preto",
      origemUf: "SP",
      destinoEndereco: "Rua Estados Unidos, 1200, Jardim América",
      destinoCidade: "São Paulo",
      destinoUf: "SP",
      coleta: 18,
      entrega: 19,
      inventario: "Residência de alto padrão com obras de arte e adega climatizada. O cliente pediu desconto e coleta no sábado.",
      valorCotado: 63500,
      responsavelId: ana.id,
      nota: "Indicação do Grupo Aurora. Em negociação de 8% e de uma equipe extra para o içamento.",
      criadoHa: 9,
    },
    {
      codigo: "MB-EX-0005",
      titulo: "Transferência de laboratório Santos–Cubatão",
      etapa: "CONTRATO",
      canal: "EMAIL",
      cliente: "Química Sul do Brasil Ltda",
      contatoId: lucia.id,
      colaborador: "Equipe de controle de qualidade",
      origemEndereco: "Av. Conselheiro Nébias, 540, galpão 3",
      origemCidade: "Santos",
      origemUf: "SP",
      destinoEndereco: "Rod. Anchieta, km 55, planta 2",
      destinoCidade: "Cubatão",
      destinoUf: "SP",
      coleta: 1,
      entrega: 1,
      inventario: "Bancadas, capela de exaustão desmontada pelo cliente, 80 caixas identificadas e 4 freezers. Seguro de carga aprovado.",
      valorCotado: 102000,
      valorAprovado: 96000,
      numeroOc: "OC-45021",
      responsavelId: carla.id,
      nota: "Contrato assinado e OC recebida. Operação confirma a equipe de 6 pessoas para amanhã.",
      criadoHa: 15,
    },
    {
      codigo: "MB-EX-0006",
      titulo: "Mudança do sócio Paulo Leme para Brasília",
      etapa: "EM_EXECUCAO",
      canal: "WHATSAPP",
      cliente: "Consultoria Leme & Associados",
      contatoId: paulo.id,
      colaborador: "Paulo Leme",
      origemEndereco: "Rua Fernandes Tourinho, 240, apto 1102, Savassi",
      origemCidade: "Belo Horizonte",
      origemUf: "MG",
      destinoEndereco: "SQS 308, bloco D, apto 204, Asa Sul",
      destinoCidade: "Brasília",
      destinoUf: "DF",
      coleta: 0,
      entrega: 2,
      inventario: "Coleta em andamento. Volume conferido: 62 volumes e 1 bicicleta. CT-e emitido na saída.",
      valorCotado: 34800,
      valorAprovado: 31200,
      numeroOc: "OC-7781",
      numeroCte: "123.456.789",
      responsavelId: carla.id,
      nota: "Caminhão saiu de Belo Horizonte às 9h. Previsão de entrega em dois dias.",
      criadoHa: 12,
    },
    {
      codigo: "MB-EX-0007",
      titulo: "Mobiliário da nova unidade Sorocaba",
      etapa: "FATURADO_HAVER",
      canal: "EMAIL",
      cliente: "Rede Clínica Aurora",
      contatoId: renata.id,
      colaborador: "Unidade Sorocaba",
      origemEndereco: "Rua Dr. Quirino, 880, depósito",
      origemCidade: "Campinas",
      origemUf: "SP",
      destinoEndereco: "Av. Moreira de Souza, 620, Jardim Vergueiro",
      destinoCidade: "Sorocaba",
      destinoUf: "SP",
      coleta: -12,
      entrega: -10,
      inventario: "Consultórios, recepção e arquivo. Descarga conferida sem avarias. Aguardando faturamento.",
      valorCotado: 24100,
      valorAprovado: 22750,
      numeroOc: "OC-902",
      numeroCte: "987.654.321",
      responsavelId: carla.id,
      nota: "Serviço finalizado. Checklist de entrega assinado pela gerente da unidade.",
      criadoHa: 20,
    },
    {
      codigo: "MB-EX-0008",
      titulo: "Escritório Nimbus da Bela Vista para Santos",
      etapa: "CONTAS_A_RECEBER",
      canal: "EMAIL",
      cliente: "Nimbus Escritórios Compartilhados",
      contatoId: caio.id,
      colaborador: "Operação da unidade Santos",
      origemEndereco: "Rua dos Pinheiros, 498, 3º andar",
      origemCidade: "São Paulo",
      origemUf: "SP",
      destinoEndereco: "Av. Ana Costa, 300, sala 71, Gonzaga",
      destinoCidade: "Santos",
      destinoUf: "SP",
      coleta: -40,
      entrega: -38,
      inventario: "18 estações, 2 cabines acústicas e copa. NF emitida; o boleto venceu e segue em cobrança.",
      valorCotado: 17200,
      valorAprovado: 15900,
      numeroOc: "OC-1882",
      numeroCte: "456.111.908",
      numeroNf: "000.123.456",
      vencimento: -15,
      responsavelId: diego.id,
      nota: "Financeiro enviou o boleto. Cliente pediu nova via e ainda não confirmou o pagamento.",
      criadoHa: 45,
    },
    {
      codigo: "MB-EX-0009",
      titulo: "Mudança do coordenador para Florianópolis",
      etapa: "RECEBIDO",
      canal: "INDICACAO",
      cliente: "Grupo Aurora Alimentos",
      contatoId: helena.id,
      colaborador: "Eduardo Prado",
      origemEndereco: "Rua Padre Anchieta, 1550, apto 42, Bigorrilho",
      origemCidade: "Curitiba",
      origemUf: "PR",
      destinoEndereco: "Rua Bocaiúva, 1800, apto 86, Centro",
      destinoCidade: "Florianópolis",
      destinoUf: "SC",
      coleta: -30,
      entrega: -28,
      inventario: "Mudança familiar corporativa concluída e recebida. Sem pendência de avaria.",
      valorCotado: 21400,
      valorAprovado: 19840,
      numeroOc: "OC-661",
      numeroCte: "222.333.444",
      numeroNf: "000.778.201",
      vencimento: -20,
      recebimento: -4,
      responsavelId: diego.id,
      criadoHa: 34,
    },
    {
      codigo: "MB-EX-0010",
      titulo: "Cotação Rio–Niterói recusada",
      etapa: "PERDIDO",
      canal: "SITE",
      cliente: "Banco Horizonte S.A.",
      contatoId: ricardo.id,
      colaborador: "Estagiários da agência",
      origemEndereco: "Av. Rio Branco, 120, 8º andar",
      origemCidade: "Rio de Janeiro",
      origemUf: "RJ",
      destinoEndereco: "Rua Gavião Peixoto, 80, Icaraí",
      destinoCidade: "Niterói",
      destinoUf: "RJ",
      inventario: "Pequena mudança de arquivo e 10 estações. O cliente optou por usar frota própria.",
      valorCotado: 8900,
      responsavelId: bruno.id,
      nota: "Cliente declinou depois da proposta. Sem retorno nas duas tentativas de contato.",
      criadoHa: 11,
    },
  ];

  for (const item of itens) {
    const criadoEm = quando(adicionarDias(hoje, -item.criadoHa), "09:30:00");
    const processo = await prisma.processo.create({
      data: {
        codigo: item.codigo,
        titulo: item.titulo,
        etapa: item.etapa,
        canal: item.canal,
        clienteId: clientes.get(item.cliente)!.id,
        contatoId: item.contatoId,
        colaborador: item.colaborador,
        origemEndereco: item.origemEndereco,
        origemCidade: item.origemCidade,
        origemUf: item.origemUf,
        destinoEndereco: item.destinoEndereco,
        destinoCidade: item.destinoCidade,
        destinoUf: item.destinoUf,
        dataColeta: item.coleta === undefined ? null : dia(adicionarDias(hoje, item.coleta)),
        dataEntrega: item.entrega === undefined ? null : dia(adicionarDias(hoje, item.entrega)),
        inventario: item.inventario,
        valorCotado: item.valorCotado ?? null,
        valorAprovado: item.valorAprovado ?? null,
        numeroOc: item.numeroOc ?? null,
        numeroCte: item.numeroCte ?? null,
        numeroNf: item.numeroNf ?? null,
        dataVencimento: item.vencimento === undefined ? null : dia(adicionarDias(hoje, item.vencimento)),
        dataRecebimento: item.recebimento === undefined ? null : dia(adicionarDias(hoje, item.recebimento)),
        responsavelId: item.responsavelId,
        exemplo: true,
        criadoEm,
      },
    });
    await prisma.evento.create({
      data: {
        processoId: processo.id,
        tipo: "CRIACAO",
        mensagem: "Processo de exemplo criado pelo seed na etapa Cotação recebida.",
        etapaPara: "LEADS_DE_ENTRADA",
        usuarioId: bruno.id,
        origem: bruno.nome,
        criadoEm,
      },
    });
    if (item.etapa !== "LEADS_DE_ENTRADA") {
      await prisma.evento.create({
        data: {
          processoId: processo.id,
          tipo: "MUDANCA_ETAPA",
          etapaDe: "LEADS_DE_ENTRADA",
          etapaPara: item.etapa,
          mensagem: `Etapa alterada de Cotação recebida para ${rotulo(item.etapa)}.`,
          usuarioId: item.responsavelId,
          origem: item.responsavelId === diego.id ? diego.nome : item.responsavelId === carla.id ? carla.nome : item.responsavelId === ana.id ? ana.nome : bruno.nome,
          criadoEm: quando(adicionarDias(hoje, -Math.max(item.criadoHa - 1, 0)), "15:10:00"),
        },
      });
    }
    if (item.nota) {
      await prisma.evento.create({
        data: {
          processoId: processo.id,
          tipo: "NOTA",
          mensagem: item.nota,
          usuarioId: item.responsavelId,
          origem: "Equipe de demonstração",
          criadoEm: quando(adicionarDias(hoje, -Math.max(item.criadoHa - 1, 0)), "16:40:00"),
        },
      });
    }
  }

  const fechado = await prisma.processo.findUniqueOrThrow({ where: { codigo: "MB-EX-0005" } });
  const arquivo = Buffer.from(
    "DADO DE EXEMPLO\nOrdem de compra OC-45021\nQuímica Sul do Brasil Ltda\nMudança Santos → Cubatão\nValor aprovado: R$ 96.000,00\n",
    "utf8",
  );
  await prisma.anexo.create({
    data: {
      processoId: fechado.id,
      nomeArquivo: "ordem-de-compra-OC-45021.txt",
      tipoMime: "text/plain",
      tamanho: arquivo.length,
      conteudo: arquivo,
      usuarioId: bruno.id,
    },
  });

  const leadWhatsapp = await prisma.processo.findUniqueOrThrow({
    where: { codigo: "MB-EX-0001" },
    include: { contato: true },
  });
  const numeroExemplo = await prisma.numeroWhatsapp.create({
    data: {
      nome: "Comercial (exemplo)",
      phoneNumberId: "exemplo-phone-id",
      numeroExibicao: "+55 11 4000-2026",
      exemplo: true,
    },
  });
  const agora = new Date();
  const conversaExemplo = await prisma.conversaWhatsapp.create({
    data: {
      numeroId: numeroExemplo.id,
      waId: "5511988213344",
      nomeContato: "Marina Alves",
      contatoId: leadWhatsapp.contatoId,
      processoId: leadWhatsapp.id,
      responsavelId: bruno.id,
      naoLida: true,
      ultimaMensagem: "Olá, preciso mudar de São Paulo para Campinas.",
      ultimaMensagemEm: agora,
      ultimaEntradaEm: agora,
      exemplo: true,
    },
  });
  await prisma.mensagemWhatsapp.create({
    data: {
      conversaId: conversaExemplo.id,
      wamid: "wamid.exemplo.marina",
      direcao: "ENTRADA",
      tipo: "TEXTO",
      texto: "Olá, preciso mudar de São Paulo para Campinas.",
      status: "RECEBIDA",
      criadaEm: agora,
    },
  });

  await prisma.chaveApi.create({
    data: {
      nome: "Agente de demonstração",
      prefixo: CHAVE_API_EXEMPLO.slice(0, 16),
      hash: hashChave(CHAVE_API_EXEMPLO),
      exemplo: true,
      criadaPorId: ana.id,
    },
  });

  for (const [slug, rotuloTarefa] of TIPOS_TAREFA) {
    await prisma.tipoTarefa.upsert({ where: { slug }, update: {}, create: { id: slug, slug, rotulo: rotuloTarefa } });
  }
  for (const [etapaSlug, tipo, titulo, horas] of REGRAS_TAREFA) {
    await prisma.regraTarefa.upsert({
      where: { etapaSlug_tipoId: { etapaSlug, tipoId: tipo } },
      update: {},
      create: { etapaSlug, tipoId: tipo, titulo, horasDepois: horas },
    });
  }
  for (const [indice, item] of CATALOGO_MUDANCA.entries()) {
    const existe = await prisma.itemCatalogo.findFirst({ where: { nome: item.nome } });
    if (!existe) {
      await prisma.itemCatalogo.create({
        data: { nome: item.nome, categoria: item.categoria, volumeM3: item.volume, ordem: indice },
      });
    }
  }

  const { garantirPortalAtvos } = await import("../src/server/portal/atvos");
  await garantirPortalAtvos();

  console.log("Seed concluído com 10 processos de exemplo.");
  console.log("Senha dos usuários de demonstração: MudeBem@2026");
  console.log("Chave de API de demonstração:", CHAVE_API_EXEMPLO);
}

function rotulo(etapa: string) {
  const mapa: Record<string, string> = {
    LEADS_DE_ENTRADA: "Leads de entrada",
    PRECIFICACAO: "Precificação",
    PROPOSTA: "Proposta",
    NEGOCIACAO: "Negociação",
    CONTRATO: "Contrato",
    EM_EXECUCAO: "Em execução",
    FATURADO_HAVER: "Faturado/Haver",
    CONTAS_A_RECEBER: "Contas a receber",
    RECEBIDO: "Recebido",
    PERDIDO: "Perdido",
  };
  return mapa[etapa] ?? etapa;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
