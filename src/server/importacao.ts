import { digitosTelefone, formatarWaId } from "@/lib/whatsapp";
import { interpretarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { carregarEtapas, slugDaEtapa } from "@/server/etapas";
import { criarProcesso } from "@/server/processos";
import type { Ator } from "@/lib/ator";

export type TipoPlanilha = "leads" | "contatos" | "empresas";

const ALIAS: { campo: string; nomes: string[] }[] = [
  { campo: "kommoId", nomes: ["id", "id do lead", "id do contato", "id da empresa", "lead id"] },
  { campo: "titulo", nomes: ["nome do lead", "lead", "nome do negocio", "negocio"] },
  { campo: "empresa", nomes: ["empresa", "nome da empresa", "companhia", "razao social"] },
  { campo: "contato", nomes: ["contato", "nome do contato", "nome"] },
  { campo: "etapa", nomes: ["etapa", "status", "etapa do lead", "status do lead"] },
  { campo: "responsavel", nomes: ["responsavel", "usuario responsavel"] },
  { campo: "telefone", nomes: ["telefone", "telefone comercial", "celular", "whatsapp"] },
  { campo: "email", nomes: ["email", "e mail", "e-mail"] },
  { campo: "cargo", nomes: ["cargo"] },
  { campo: "cpf", nomes: ["cpf"] },
  { campo: "documento", nomes: ["documento", "rg"] },
  { campo: "cnpj", nomes: ["cnpj"] },
  { campo: "inscricaoEstadual", nomes: ["i e", "ie", "inscricao estadual"] },
  { campo: "site", nomes: ["site", "website"] },
  { campo: "endereco", nomes: ["endereco"] },
  { campo: "cidade", nomes: ["cidade"] },
  { campo: "uf", nomes: ["uf", "estado"] },
  { campo: "origemCidade", nomes: ["cidade origem", "cidade de origem", "origem cidade"] },
  { campo: "origemEndereco", nomes: ["endereco origem", "endereco de origem", "origem endereco"] },
  { campo: "origemReferencia", nomes: ["ponto de referencia origem", "referencia origem", "ponto de referencia de origem"] },
  { campo: "origemAndar", nomes: ["andar origem", "andar de origem"] },
  { campo: "origemElevador", nomes: ["elevador origem", "elevador de origem"] },
  { campo: "origemImovel", nomes: ["imovel origem", "imovel de origem"] },
  { campo: "destinoCidade", nomes: ["cidade destino", "cidade de destino", "destino cidade"] },
  { campo: "destinoEndereco", nomes: ["endereco destino", "endereco de destino", "destino endereco"] },
  { campo: "destinoReferencia", nomes: ["ponto de referencia destino", "referencia destino", "ponto de referencia de destino"] },
  { campo: "destinoAndar", nomes: ["andar destino", "andar de destino"] },
  { campo: "destinoElevador", nomes: ["elevador destino", "elevador de destino"] },
  { campo: "destinoImovel", nomes: ["imovel destino", "imovel de destino"] },
  { campo: "modalidade", nomes: ["modalidade"] },
  { campo: "descricaoColeta", nomes: ["coleta"] },
  { campo: "descricaoEntrega", nomes: ["entrega"] },
  { campo: "embalagemNecessaria", nomes: ["embalagem", "embalagem necessaria"] },
  { campo: "volume", nomes: ["volume"] },
  { campo: "inventario", nomes: ["inventario"] },
  { campo: "itensEspeciais", nomes: ["itens especiais"] },
  { campo: "dataPretendida", nomes: ["data pretendida"] },
  { campo: "dataColeta", nomes: ["data da coleta", "data de coleta", "data coleta"] },
  { campo: "dataEntrega", nomes: ["data da entrega", "data de entrega", "data entrega"] },
  { campo: "dataPrevista", nomes: ["data prevista"] },
  { campo: "dataEmissao", nomes: ["data emissao", "data de emissao"] },
  { campo: "diasParaColetar", nomes: ["dias p coletar", "dias para coletar", "dias p/ coletar"] },
  { campo: "diasParaViagem", nomes: ["dias p viagem", "dias para viagem", "dias p/ viagem"] },
  { campo: "motoristaNome", nomes: ["motorista", "nome do motorista"] },
  { campo: "motoristaPlaca", nomes: ["placa"] },
  { campo: "motoristaAntt", nomes: ["antt"] },
  { campo: "motoristaCnh", nomes: ["cnh"] },
  { campo: "motoristaCpf", nomes: ["cpf motorista", "cpf do motorista"] },
  { campo: "valorFrete", nomes: ["valor do frete", "frete"] },
  { campo: "valorSeguro", nomes: ["valor seguro", "valor do seguro", "seguro"] },
  { campo: "valorTransporte", nomes: ["valor transporte", "valor do transporte", "transporte"] },
  { campo: "valorTotal", nomes: ["valor total", "orcamento", "venda", "valor"] },
  { campo: "valorCotado", nomes: ["valor cotado"] },
  { campo: "valorAprovado", nomes: ["valor aprovado"] },
  { campo: "formaPagamento", nomes: ["forma de pagamento", "pagamento"] },
  { campo: "validadeProposta", nomes: ["validade da proposta", "validade proposta"] },
  { campo: "linkProposta", nomes: ["link proposta", "proposta link", "link da proposta"] },
  { campo: "linkContrato", nomes: ["link contrato", "link do contrato"] },
  { campo: "linkContratoCarreteiro", nomes: ["link contrato carreteiro", "contrato carreteiro"] },
  { campo: "linkOs", nomes: ["link os", "o s", "os", "link da os"] },
  { campo: "linkRecibo", nomes: ["link recibo", "recibo"] },
  { campo: "fonte", nomes: ["fonte", "origem do lead"] },
  { campo: "utmSource", nomes: ["utm source", "utm_source"] },
  { campo: "utmMedium", nomes: ["utm medium", "utm_medium"] },
  { campo: "utmCampaign", nomes: ["utm campaign", "utm_campaign"] },
  { campo: "utmTerm", nomes: ["utm term", "utm_term"] },
  { campo: "utmContent", nomes: ["utm content", "utm_content"] },
  { campo: "fbclid", nomes: ["fbclid"] },
  { campo: "gclid", nomes: ["gclid"] },
  { campo: "metaCampaignId", nomes: ["meta campaign id", "campaign id", "id da campanha"] },
  { campo: "metaAdId", nomes: ["meta ad id", "ad id", "id do anuncio"] },
  { campo: "referrer", nomes: ["referrer", "referencia"] },
  { campo: "formulario", nomes: ["form", "formulario"] },
  { campo: "canal", nomes: ["canal", "canal de origem"] },
];

export function normalizarCabecalho(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function analisarCsv(texto: string): string[][] {
  const limpo = texto.replace(/^\uFEFF/, "");
  const primeira = limpo.split(/\r?\n/, 1)[0] ?? "";
  const separador = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < limpo.length; i += 1) {
    const caractere = limpo[i];
    if (aspas) {
      if (caractere === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else aspas = false;
      } else campo += caractere;
    } else if (caractere === '"') aspas = true;
    else if (caractere === separador) {
      linha.push(campo.trim());
      campo = "";
    } else if (caractere === "\n") {
      linha.push(campo.trim());
      if (linha.some((item) => item !== "")) linhas.push(linha);
      linha = [];
      campo = "";
    } else if (caractere !== "\r") campo += caractere;
  }
  linha.push(campo.trim());
  if (linha.some((item) => item !== "")) linhas.push(linha);
  return linhas;
}

function indiceDosCampos(cabecalhos: string[]) {
  const mapa = new Map<string, number>();
  cabecalhos.forEach((coluna, indice) => {
    const chave = normalizarCabecalho(coluna);
    const conhecido = ALIAS.find((item) => item.nomes.includes(chave));
    if (conhecido && !mapa.has(conhecido.campo)) mapa.set(conhecido.campo, indice);
  });
  return mapa;
}

function celula(linha: string[], mapa: Map<string, number>, campo: string) {
  const indice = mapa.get(campo);
  if (indice == null) return "";
  return linha[indice]?.trim() ?? "";
}

function dinheiro(valor: string) {
  if (!valor) return null;
  const normalizado = valor.includes(",") ? valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "") : valor.replace(/[^\d.-]/g, "");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

function inteiro(valor: string) {
  if (!valor) return null;
  const numero = Number(valor.replace(/\D/g, ""));
  return Number.isInteger(numero) ? numero : null;
}

async function etapaDoRotulo(rotulo: string) {
  if (!rotulo) return "LEADS_DE_ENTRADA";
  const etapas = await carregarEtapas();
  const chave = normalizarCabecalho(rotulo);
  const existente = etapas.find((etapa) => normalizarCabecalho(etapa.rotulo) === chave || normalizarCabecalho(etapa.slug) === chave);
  if (existente) return existente.slug;
  const slug = slugDaEtapa(rotulo);
  const ordem = Math.max(0, ...etapas.filter((etapa) => !etapa.terminal).map((etapa) => etapa.ordem)) + 5;
  await prisma.etapaPipeline.upsert({
    where: { slug },
    update: {},
    create: { id: slug, slug, rotulo, resumo: "Etapa importada da Kommo.", cor: "#8a8175", ordem, grupo: "comercial", terminal: false },
  });
  return slug;
}

async function usuarioPorNome(nome: string) {
  if (!nome) return null;
  const usuarios = await prisma.usuario.findMany({ where: { ativo: true } });
  const chave = normalizarCabecalho(nome);
  return usuarios.find((usuario) => normalizarCabecalho(usuario.nome) === chave)?.id ?? null;
}

async function clienteDaLinha(linha: string[], mapa: Map<string, number>, kommoEmpresa?: string) {
  const nome = celula(linha, mapa, "empresa") || "Cliente sem nome";
  const cnpj = celula(linha, mapa, "cnpj").replace(/\D/g, "") || null;
  const kommoId = kommoEmpresa || null;
  const dados = {
    nome,
    cnpj: cnpj && cnpj.length === 14 ? cnpj : null,
    email: celula(linha, mapa, "email") || null,
    telefone: celula(linha, mapa, "telefone") || null,
    endereco: celula(linha, mapa, "endereco") || null,
    cidade: celula(linha, mapa, "cidade") || null,
    uf: celula(linha, mapa, "uf").slice(0, 2).toUpperCase() || null,
    inscricaoEstadual: celula(linha, mapa, "inscricaoEstadual") || null,
    site: celula(linha, mapa, "site") || null,
    kommoId,
  };
  if (kommoId) {
    const peloId = await prisma.cliente.findUnique({ where: { kommoId } });
    if (peloId) return prisma.cliente.update({ where: { id: peloId.id }, data: dados });
  }
  if (dados.cnpj) {
    const peloCnpj = await prisma.cliente.findUnique({ where: { cnpj: dados.cnpj } });
    if (peloCnpj) return prisma.cliente.update({ where: { id: peloCnpj.id }, data: { ...dados, kommoId: kommoId ?? peloCnpj.kommoId } });
  }
  const peloNome = await prisma.cliente.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } } });
  if (peloNome) return prisma.cliente.update({ where: { id: peloNome.id }, data: dados });
  return prisma.cliente.create({ data: dados });
}

export async function importarPlanilha(tipo: TipoPlanilha, csv: string, ator: Ator) {
  const tabela = analisarCsv(csv);
  if (tabela.length < 2) return { criados: 0, atualizados: 0, erros: ["A planilha precisa de cabeçalho e ao menos uma linha."] };
  const cabecalhos = tabela[0];
  const mapa = indiceDosCampos(cabecalhos);
  let criados = 0;
  let atualizados = 0;
  const erros: string[] = [];

  for (let i = 1; i < tabela.length; i += 1) {
    const linha = tabela[i];
    try {
      if (tipo === "empresas") {
        const antes = celula(linha, mapa, "kommoId");
        const existente = antes ? await prisma.cliente.findUnique({ where: { kommoId: antes } }) : null;
        await clienteDaLinha(linha, mapa, antes);
        if (existente) atualizados += 1;
        else criados += 1;
      } else if (tipo === "contatos") {
        const cliente = await clienteDaLinha(linha, mapa);
        const kommoId = celula(linha, mapa, "kommoId") || null;
        const dados = {
          clienteId: cliente.id,
          nome: celula(linha, mapa, "contato") || celula(linha, mapa, "titulo") || "Contato",
          email: celula(linha, mapa, "email") || null,
          telefone: celula(linha, mapa, "telefone") || null,
          cargo: celula(linha, mapa, "cargo") || null,
          cpf: celula(linha, mapa, "cpf") || null,
          documento: celula(linha, mapa, "documento") || null,
          kommoId,
        };
        const existente = kommoId ? await prisma.contato.findUnique({ where: { kommoId } }) : null;
        if (existente) {
          await prisma.contato.update({ where: { id: existente.id }, data: dados });
          atualizados += 1;
        } else {
          await prisma.contato.create({ data: dados });
          criados += 1;
        }
      } else {
        const resultado = await importarLead(linha, mapa, cabecalhos, ator);
        if (resultado === "atualizado") atualizados += 1;
        else criados += 1;
      }
    } catch (erro) {
      erros.push(`Linha ${i + 1}: ${erro instanceof Error ? erro.message : "erro"}`);
    }
  }
  return { criados, atualizados, erros };
}

async function importarLead(linha: string[], mapa: Map<string, number>, cabecalhos: string[], ator: Ator) {
  const kommoId = celula(linha, mapa, "kommoId") || null;
  const cliente = await clienteDaLinha(linha, mapa);
  const nomeContato = celula(linha, mapa, "contato") || celula(linha, mapa, "titulo") || cliente.nome;
  const telefone = celula(linha, mapa, "telefone");
  let contato = telefone
    ? await prisma.contato.findFirst({
        where: { clienteId: cliente.id, telefone: { contains: digitosTelefone(telefone).slice(-8) } },
      })
    : null;
  if (!contato) {
    contato = await prisma.contato.create({
      data: {
        clienteId: cliente.id,
        nome: nomeContato,
        email: celula(linha, mapa, "email") || null,
        telefone: telefone ? formatarWaId(digitosTelefone(telefone)) : null,
        cargo: celula(linha, mapa, "cargo") || null,
        cpf: celula(linha, mapa, "cpf") || null,
        documento: celula(linha, mapa, "documento") || null,
        principal: true,
      },
    });
  }
  const etapa = await etapaDoRotulo(celula(linha, mapa, "etapa"));
  const responsavelId = await usuarioPorNome(celula(linha, mapa, "responsavel"));
  const extras: Record<string, string> = {};
  for (let coluna = 0; coluna < cabecalhos.length; coluna += 1) {
    const chave = normalizarCabecalho(cabecalhos[coluna]);
    if (!chave || ALIAS.some((item) => item.nomes.includes(chave))) continue;
    const valor = linha[coluna]?.trim();
    if (!valor) continue;
    extras[chave] = valor;
    await prisma.campoPersonalizado.upsert({
      where: { entidade_chave: { entidade: "PROCESSO", chave: chave.slice(0, 60) } },
      update: {},
      create: { entidade: "PROCESSO", chave: chave.slice(0, 60), rotulo: cabecalhos[coluna].slice(0, 120) },
    });
  }
  const dados = {
    titulo: (celula(linha, mapa, "titulo") || `Lead ${kommoId ?? cliente.nome}`).slice(0, 180),
    etapa,
    clienteId: cliente.id,
    contatoId: contato.id,
    responsavelId,
    origemCidade: celula(linha, mapa, "origemCidade") || null,
    origemEndereco: celula(linha, mapa, "origemEndereco") || null,
    origemReferencia: celula(linha, mapa, "origemReferencia") || null,
    origemAndar: celula(linha, mapa, "origemAndar") || null,
    origemElevador: celula(linha, mapa, "origemElevador") || null,
    origemImovel: celula(linha, mapa, "origemImovel") || null,
    destinoCidade: celula(linha, mapa, "destinoCidade") || null,
    destinoEndereco: celula(linha, mapa, "destinoEndereco") || null,
    destinoReferencia: celula(linha, mapa, "destinoReferencia") || null,
    destinoAndar: celula(linha, mapa, "destinoAndar") || null,
    destinoElevador: celula(linha, mapa, "destinoElevador") || null,
    destinoImovel: celula(linha, mapa, "destinoImovel") || null,
    modalidade: celula(linha, mapa, "modalidade") || null,
    descricaoColeta: celula(linha, mapa, "descricaoColeta") || null,
    descricaoEntrega: celula(linha, mapa, "descricaoEntrega") || null,
    volume: celula(linha, mapa, "volume") || null,
    inventario: celula(linha, mapa, "inventario") || null,
    itensEspeciais: celula(linha, mapa, "itensEspeciais") || null,
    dataPretendida: dataOuNula(celula(linha, mapa, "dataPretendida")),
    dataColeta: dataOuNula(celula(linha, mapa, "dataColeta")),
    dataEntrega: dataOuNula(celula(linha, mapa, "dataEntrega")),
    dataPrevista: dataOuNula(celula(linha, mapa, "dataPrevista")),
    dataEmissao: dataOuNula(celula(linha, mapa, "dataEmissao")),
    validadeProposta: dataOuNula(celula(linha, mapa, "validadeProposta")),
    diasParaColetar: inteiro(celula(linha, mapa, "diasParaColetar")),
    diasParaViagem: inteiro(celula(linha, mapa, "diasParaViagem")),
    motoristaNome: celula(linha, mapa, "motoristaNome") || null,
    motoristaPlaca: celula(linha, mapa, "motoristaPlaca") || null,
    motoristaAntt: celula(linha, mapa, "motoristaAntt") || null,
    motoristaCnh: celula(linha, mapa, "motoristaCnh") || null,
    motoristaCpf: celula(linha, mapa, "motoristaCpf") || null,
    valorFrete: dinheiro(celula(linha, mapa, "valorFrete")),
    valorSeguro: dinheiro(celula(linha, mapa, "valorSeguro")),
    valorTransporte: dinheiro(celula(linha, mapa, "valorTransporte")),
    valorTotal: dinheiro(celula(linha, mapa, "valorTotal")),
    valorCotado: dinheiro(celula(linha, mapa, "valorCotado")) ?? dinheiro(celula(linha, mapa, "valorTotal")),
    valorAprovado: dinheiro(celula(linha, mapa, "valorAprovado")),
    formaPagamento: celula(linha, mapa, "formaPagamento") || null,
    linkProposta: celula(linha, mapa, "linkProposta") || null,
    linkContrato: celula(linha, mapa, "linkContrato") || null,
    linkContratoCarreteiro: celula(linha, mapa, "linkContratoCarreteiro") || null,
    linkOs: celula(linha, mapa, "linkOs") || null,
    linkRecibo: celula(linha, mapa, "linkRecibo") || null,
    fonte: celula(linha, mapa, "fonte") || null,
    utmSource: celula(linha, mapa, "utmSource") || null,
    utmMedium: celula(linha, mapa, "utmMedium") || null,
    utmCampaign: celula(linha, mapa, "utmCampaign") || null,
    utmTerm: celula(linha, mapa, "utmTerm") || null,
    utmContent: celula(linha, mapa, "utmContent") || null,
    fbclid: celula(linha, mapa, "fbclid") || null,
    gclid: celula(linha, mapa, "gclid") || null,
    metaCampaignId: celula(linha, mapa, "metaCampaignId") || null,
    metaAdId: celula(linha, mapa, "metaAdId") || null,
    referrer: celula(linha, mapa, "referrer") || null,
    formulario: celula(linha, mapa, "formulario") || null,
    extras: Object.keys(extras).length ? extras : undefined,
    kommoId,
  };
  const existente = kommoId ? await prisma.processo.findUnique({ where: { kommoId } }) : null;
  if (existente) {
    await prisma.processo.update({ where: { id: existente.id }, data: dados });
    return "atualizado" as const;
  }
  await criarProcesso(ator, {
    titulo: dados.titulo,
    canal: "INDICACAO",
    etapa: dados.etapa,
    clienteId: cliente.id,
    contatoId: contato.id,
    responsavelId,
    origemCidade: dados.origemCidade,
    origemEndereco: dados.origemEndereco,
    destinoCidade: dados.destinoCidade,
    destinoEndereco: dados.destinoEndereco,
    inventario: dados.inventario,
    valorCotado: dados.valorCotado,
    valorAprovado: dados.valorAprovado,
  });
  const criado = await prisma.processo.findFirst({ where: { titulo: dados.titulo, clienteId: cliente.id }, orderBy: { criadoEm: "desc" } });
  if (criado) await prisma.processo.update({ where: { id: criado.id }, data: dados });
  return "criado" as const;
}

function dataOuNula(valor: string) {
  const iso = interpretarData(valor);
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

export function resumoDaPlanilha(csv: string) {
  const tabela = analisarCsv(csv);
  return { colunas: tabela[0] ?? [], linhas: Math.max(0, tabela.length - 1), amostra: tabela.slice(1, 4) };
}
