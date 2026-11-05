CREATE TABLE "EtapaPipeline" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "resumo" TEXT NOT NULL DEFAULT '',
    "cor" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "grupo" TEXT NOT NULL,
    "terminal" BOOLEAN NOT NULL DEFAULT false,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EtapaPipeline_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EtapaPipeline_slug_key" ON "EtapaPipeline"("slug");

INSERT INTO "EtapaPipeline" ("id", "slug", "rotulo", "resumo", "cor", "ordem", "grupo", "terminal") VALUES
('LEADS_DE_ENTRADA', 'LEADS_DE_ENTRADA', 'Leads de entrada', 'Lead recém-chegado, ainda sem contato qualificado.', '#3d6b8c', 10, 'comercial', false),
('CONTATO_INICIAL', 'CONTATO_INICIAL', 'Contato inicial', 'Primeiro retorno feito ao cliente.', '#4d7ea8', 20, 'comercial', false),
('PRECIFICACAO', 'PRECIFICACAO', 'Precificação', 'Montagem do preço de frete, seguro e transporte.', '#2f6f6a', 30, 'comercial', false),
('PROPOSTA', 'PROPOSTA', 'Proposta', 'Proposta enviada ao cliente.', '#1e4d3a', 40, 'comercial', false),
('NEGOCIACAO', 'NEGOCIACAO', 'Negociação', 'Ajustes de escopo, data ou valor.', '#b5842f', 50, 'comercial', false),
('PRIORIDADE', 'PRIORIDADE', 'Prioridade', 'Oportunidade quente, com decisão próxima.', '#c47b2a', 60, 'comercial', false),
('CONTRATO', 'CONTRATO', 'Contrato', 'Fechado, com contrato ou OC.', '#c45c26', 70, 'comercial', false),
('A_EXECUTAR', 'A_EXECUTAR', 'A executar', 'Na fila da operação, aguardando a coleta.', '#a3472c', 80, 'operacao', false),
('EM_EXECUCAO', 'EM_EXECUCAO', 'Em execução', 'Coleta, trânsito ou entrega em curso.', '#8a3b28', 90, 'operacao', false),
('FATURADO_HAVER', 'FATURADO_HAVER', 'Faturado/Haver', 'Serviço faturado ou com haver a conciliar.', '#6e4c7a', 100, 'financeiro', false),
('CONTAS_A_RECEBER', 'CONTAS_A_RECEBER', 'Contas a receber', 'Título em aberto no financeiro.', '#5c3d78', 110, 'financeiro', false),
('RECEBIDO', 'RECEBIDO', 'Recebido', 'Valor entrou no caixa.', '#1f6b45', 120, 'financeiro', true),
('GANHO', 'GANHO', 'Ganho', 'Oportunidade ganha.', '#2e7d4f', 130, 'terminal', true),
('PERDIDO', 'PERDIDO', 'Perdido', 'Cliente desistiu ou a proposta foi recusada.', '#8a8175', 140, 'terminal', true);

ALTER TABLE "Processo" ADD COLUMN "etapaNova" TEXT;
UPDATE "Processo" SET "etapaNova" = CASE "etapa"::text
  WHEN 'COTACAO_RECEBIDA' THEN 'LEADS_DE_ENTRADA'
  WHEN 'PRECIFICACAO' THEN 'PRECIFICACAO'
  WHEN 'PROPOSTA_ENVIADA' THEN 'PROPOSTA'
  WHEN 'NEGOCIACAO' THEN 'NEGOCIACAO'
  WHEN 'FECHADO_CONTRATO' THEN 'CONTRATO'
  WHEN 'EM_EXECUCAO' THEN 'EM_EXECUCAO'
  WHEN 'FINALIZADO' THEN 'FATURADO_HAVER'
  WHEN 'CONTAS_A_RECEBER' THEN 'CONTAS_A_RECEBER'
  WHEN 'RECEBIDO' THEN 'RECEBIDO'
  WHEN 'PERDIDO_DECLINADO' THEN 'PERDIDO'
  ELSE 'LEADS_DE_ENTRADA'
END;
ALTER TABLE "Processo" DROP COLUMN "etapa";
ALTER TABLE "Processo" RENAME COLUMN "etapaNova" TO "etapa";
ALTER TABLE "Processo" ALTER COLUMN "etapa" SET NOT NULL;
ALTER TABLE "Processo" ALTER COLUMN "etapa" SET DEFAULT 'LEADS_DE_ENTRADA';
CREATE INDEX "Processo_etapa_idx" ON "Processo"("etapa");

ALTER TABLE "Evento" ADD COLUMN "etapaDeNova" TEXT;
ALTER TABLE "Evento" ADD COLUMN "etapaParaNova" TEXT;
UPDATE "Evento" SET
  "etapaDeNova" = CASE "etapaDe"::text
    WHEN 'COTACAO_RECEBIDA' THEN 'LEADS_DE_ENTRADA'
    WHEN 'PRECIFICACAO' THEN 'PRECIFICACAO'
    WHEN 'PROPOSTA_ENVIADA' THEN 'PROPOSTA'
    WHEN 'NEGOCIACAO' THEN 'NEGOCIACAO'
    WHEN 'FECHADO_CONTRATO' THEN 'CONTRATO'
    WHEN 'EM_EXECUCAO' THEN 'EM_EXECUCAO'
    WHEN 'FINALIZADO' THEN 'FATURADO_HAVER'
    WHEN 'CONTAS_A_RECEBER' THEN 'CONTAS_A_RECEBER'
    WHEN 'RECEBIDO' THEN 'RECEBIDO'
    WHEN 'PERDIDO_DECLINADO' THEN 'PERDIDO'
    ELSE NULL
  END,
  "etapaParaNova" = CASE "etapaPara"::text
    WHEN 'COTACAO_RECEBIDA' THEN 'LEADS_DE_ENTRADA'
    WHEN 'PRECIFICACAO' THEN 'PRECIFICACAO'
    WHEN 'PROPOSTA_ENVIADA' THEN 'PROPOSTA'
    WHEN 'NEGOCIACAO' THEN 'NEGOCIACAO'
    WHEN 'FECHADO_CONTRATO' THEN 'CONTRATO'
    WHEN 'EM_EXECUCAO' THEN 'EM_EXECUCAO'
    WHEN 'FINALIZADO' THEN 'FATURADO_HAVER'
    WHEN 'CONTAS_A_RECEBER' THEN 'CONTAS_A_RECEBER'
    WHEN 'RECEBIDO' THEN 'RECEBIDO'
    WHEN 'PERDIDO_DECLINADO' THEN 'PERDIDO'
    ELSE NULL
  END;
ALTER TABLE "Evento" DROP COLUMN "etapaDe";
ALTER TABLE "Evento" DROP COLUMN "etapaPara";
ALTER TABLE "Evento" RENAME COLUMN "etapaDeNova" TO "etapaDe";
ALTER TABLE "Evento" RENAME COLUMN "etapaParaNova" TO "etapaPara";

DROP TYPE "Etapa";

ALTER TABLE "Cliente" ADD COLUMN "inscricaoEstadual" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "site" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "kommoId" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "extras" JSONB;
CREATE UNIQUE INDEX "Cliente_kommoId_key" ON "Cliente"("kommoId");

ALTER TABLE "Contato" ADD COLUMN "cpf" TEXT;
ALTER TABLE "Contato" ADD COLUMN "documento" TEXT;
ALTER TABLE "Contato" ADD COLUMN "kommoId" TEXT;
ALTER TABLE "Contato" ADD COLUMN "extras" JSONB;
CREATE UNIQUE INDEX "Contato_kommoId_key" ON "Contato"("kommoId");

ALTER TABLE "Processo" ADD COLUMN "kommoId" TEXT;
ALTER TABLE "Processo" ADD COLUMN "extras" JSONB;
ALTER TABLE "Processo" ADD COLUMN "origemReferencia" TEXT;
ALTER TABLE "Processo" ADD COLUMN "origemAndar" TEXT;
ALTER TABLE "Processo" ADD COLUMN "origemElevador" TEXT;
ALTER TABLE "Processo" ADD COLUMN "origemImovel" TEXT;
ALTER TABLE "Processo" ADD COLUMN "destinoReferencia" TEXT;
ALTER TABLE "Processo" ADD COLUMN "destinoAndar" TEXT;
ALTER TABLE "Processo" ADD COLUMN "destinoElevador" TEXT;
ALTER TABLE "Processo" ADD COLUMN "destinoImovel" TEXT;
ALTER TABLE "Processo" ADD COLUMN "modalidade" TEXT;
ALTER TABLE "Processo" ADD COLUMN "descricaoColeta" TEXT;
ALTER TABLE "Processo" ADD COLUMN "descricaoEntrega" TEXT;
ALTER TABLE "Processo" ADD COLUMN "embalagemNecessaria" BOOLEAN;
ALTER TABLE "Processo" ADD COLUMN "volume" TEXT;
ALTER TABLE "Processo" ADD COLUMN "itensEspeciais" TEXT;
ALTER TABLE "Processo" ADD COLUMN "dataPretendida" DATE;
ALTER TABLE "Processo" ADD COLUMN "dataPrevista" DATE;
ALTER TABLE "Processo" ADD COLUMN "dataEmissao" DATE;
ALTER TABLE "Processo" ADD COLUMN "diasParaColetar" INTEGER;
ALTER TABLE "Processo" ADD COLUMN "diasParaViagem" INTEGER;
ALTER TABLE "Processo" ADD COLUMN "motoristaNome" TEXT;
ALTER TABLE "Processo" ADD COLUMN "motoristaPlaca" TEXT;
ALTER TABLE "Processo" ADD COLUMN "motoristaAntt" TEXT;
ALTER TABLE "Processo" ADD COLUMN "motoristaCnh" TEXT;
ALTER TABLE "Processo" ADD COLUMN "motoristaCpf" TEXT;
ALTER TABLE "Processo" ADD COLUMN "valorFrete" DECIMAL(12,2);
ALTER TABLE "Processo" ADD COLUMN "valorSeguro" DECIMAL(12,2);
ALTER TABLE "Processo" ADD COLUMN "valorTransporte" DECIMAL(12,2);
ALTER TABLE "Processo" ADD COLUMN "valorTotal" DECIMAL(12,2);
ALTER TABLE "Processo" ADD COLUMN "formaPagamento" TEXT;
ALTER TABLE "Processo" ADD COLUMN "validadeProposta" DATE;
ALTER TABLE "Processo" ADD COLUMN "linkProposta" TEXT;
ALTER TABLE "Processo" ADD COLUMN "linkContrato" TEXT;
ALTER TABLE "Processo" ADD COLUMN "linkContratoCarreteiro" TEXT;
ALTER TABLE "Processo" ADD COLUMN "linkOs" TEXT;
ALTER TABLE "Processo" ADD COLUMN "linkRecibo" TEXT;
ALTER TABLE "Processo" ADD COLUMN "fonte" TEXT;
ALTER TABLE "Processo" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "Processo" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "Processo" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "Processo" ADD COLUMN "utmTerm" TEXT;
ALTER TABLE "Processo" ADD COLUMN "utmContent" TEXT;
ALTER TABLE "Processo" ADD COLUMN "fbclid" TEXT;
ALTER TABLE "Processo" ADD COLUMN "gclid" TEXT;
ALTER TABLE "Processo" ADD COLUMN "metaCampaignId" TEXT;
ALTER TABLE "Processo" ADD COLUMN "metaAdId" TEXT;
ALTER TABLE "Processo" ADD COLUMN "referrer" TEXT;
ALTER TABLE "Processo" ADD COLUMN "formulario" TEXT;
CREATE UNIQUE INDEX "Processo_kommoId_key" ON "Processo"("kommoId");

CREATE TABLE "CampoPersonalizado" (
    "id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'TEXTO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampoPersonalizado_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CampoPersonalizado_entidade_chave_key" ON "CampoPersonalizado"("entidade", "chave");
