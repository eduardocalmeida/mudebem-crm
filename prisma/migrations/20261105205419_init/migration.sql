-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'COMERCIAL', 'OPERACAO', 'FINANCEIRO');

-- CreateEnum
CREATE TYPE "Etapa" AS ENUM ('COTACAO_RECEBIDA', 'PRECIFICACAO', 'PROPOSTA_ENVIADA', 'NEGOCIACAO', 'FECHADO_CONTRATO', 'EM_EXECUCAO', 'FINALIZADO', 'CONTAS_A_RECEBER', 'RECEBIDO', 'PERDIDO_DECLINADO');

-- CreateEnum
CREATE TYPE "CanalOrigem" AS ENUM ('EMAIL', 'SITE', 'WHATSAPP', 'INDICACAO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('CRIACAO', 'MUDANCA_ETAPA', 'NOTA', 'ATUALIZACAO', 'ANEXO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaveApi" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "exemplo" BOOLEAN NOT NULL DEFAULT false,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogadaEm" TIMESTAMP(3),
    "ultimoUsoEm" TIMESTAMP(3),
    "criadaPorId" TEXT NOT NULL,

    CONSTRAINT "ChaveApi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "observacoes" TEXT,
    "exemplo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contato" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cargo" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "etapa" "Etapa" NOT NULL DEFAULT 'COTACAO_RECEBIDA',
    "canal" "CanalOrigem" NOT NULL,
    "clienteId" TEXT NOT NULL,
    "contatoId" TEXT,
    "colaborador" TEXT,
    "origemEndereco" TEXT,
    "origemCidade" TEXT,
    "origemUf" TEXT,
    "destinoEndereco" TEXT,
    "destinoCidade" TEXT,
    "destinoUf" TEXT,
    "dataColeta" DATE,
    "dataEntrega" DATE,
    "inventario" TEXT,
    "valorCotado" DECIMAL(12,2),
    "valorAprovado" DECIMAL(12,2),
    "numeroOc" TEXT,
    "numeroCte" TEXT,
    "numeroNf" TEXT,
    "dataVencimento" DATE,
    "dataRecebimento" DATE,
    "responsavelId" TEXT,
    "exemplo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "mensagem" TEXT NOT NULL,
    "etapaDe" "Etapa",
    "etapaPara" "Etapa",
    "usuarioId" TEXT,
    "origem" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anexo" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ChaveApi_hash_key" ON "ChaveApi"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cnpj_key" ON "Cliente"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Processo_codigo_key" ON "Processo"("codigo");

-- CreateIndex
CREATE INDEX "Processo_etapa_idx" ON "Processo"("etapa");

-- CreateIndex
CREATE INDEX "Processo_clienteId_idx" ON "Processo"("clienteId");

-- CreateIndex
CREATE INDEX "Processo_responsavelId_idx" ON "Processo"("responsavelId");

-- CreateIndex
CREATE INDEX "Processo_dataColeta_idx" ON "Processo"("dataColeta");

-- CreateIndex
CREATE INDEX "Processo_dataVencimento_idx" ON "Processo"("dataVencimento");

-- CreateIndex
CREATE INDEX "Evento_processoId_criadoEm_idx" ON "Evento"("processoId", "criadoEm");

-- AddForeignKey
ALTER TABLE "ChaveApi" ADD CONSTRAINT "ChaveApi_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contato" ADD CONSTRAINT "Contato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
