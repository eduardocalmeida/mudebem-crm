-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "aprovacaoPortal" TEXT,
ADD COLUMN     "contratoEmpresaId" TEXT,
ADD COLUMN     "etiqueta" TEXT;

-- CreateTable
CREATE TABLE "EmpresaCliente" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "razaoSocial" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "clienteId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpresaCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeEmpresa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT,
    "uf" TEXT,

    CONSTRAINT "UnidadeEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoEmpresa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "inicio" DATE,
    "fim" DATE,
    "seguroPercentual" DECIMAL(8,6) NOT NULL DEFAULT 0.02,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContratoEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaixaPreco" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "volumeMin" DECIMAL(10,2) NOT NULL,
    "volumeMax" DECIMAL(10,2) NOT NULL,
    "kmMin" DECIMAL(10,2) NOT NULL,
    "kmMax" DECIMAL(10,2) NOT NULL,
    "precoPorKm" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "FaixaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioPortal" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenPortal" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoPortal" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "unidadeId" TEXT,
    "usuarioId" TEXT,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "dataPrevista" DATE,
    "origemEndereco" TEXT,
    "origemCep" TEXT,
    "origemCidade" TEXT,
    "origemUf" TEXT,
    "destinoEndereco" TEXT,
    "destinoCep" TEXT,
    "destinoCidade" TEXT,
    "destinoUf" TEXT,
    "distanciaKm" DECIMAL(10,2) NOT NULL,
    "volumeM3" DECIMAL(10,3) NOT NULL,
    "valorDeclarado" DECIMAL(14,2) NOT NULL,
    "precoPorKm" DECIMAL(12,2),
    "frete" DECIMAL(14,2),
    "seguro" DECIMAL(14,2),
    "total" DECIMAL(14,2),
    "semFaixa" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ENVIADA',
    "motivoRecusa" TEXT,
    "decididoEm" TIMESTAMP(3),
    "decididoPor" TEXT,
    "processoId" TEXT,
    "itens" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "processoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailFila" (
    "id" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SEM_SMTP',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailFila_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaCliente_slug_key" ON "EmpresaCliente"("slug");

-- CreateIndex
CREATE INDEX "FaixaPreco_contratoId_idx" ON "FaixaPreco"("contratoId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioPortal_empresaId_email_key" ON "UsuarioPortal"("empresaId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "TokenPortal_hash_key" ON "TokenPortal"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoPortal_protocolo_key" ON "SolicitacaoPortal"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoPortal_processoId_key" ON "SolicitacaoPortal"("processoId");

-- CreateIndex
CREATE INDEX "SolicitacaoPortal_empresaId_idx" ON "SolicitacaoPortal"("empresaId");

-- CreateIndex
CREATE INDEX "SolicitacaoPortal_email_idx" ON "SolicitacaoPortal"("email");

-- CreateIndex
CREATE INDEX "Processo_etiqueta_idx" ON "Processo"("etiqueta");

-- CreateIndex
CREATE INDEX "Processo_contratoEmpresaId_idx" ON "Processo"("contratoEmpresaId");

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_contratoEmpresaId_fkey" FOREIGN KEY ("contratoEmpresaId") REFERENCES "ContratoEmpresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaCliente" ADD CONSTRAINT "EmpresaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeEmpresa" ADD CONSTRAINT "UnidadeEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "EmpresaCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoEmpresa" ADD CONSTRAINT "ContratoEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "EmpresaCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaixaPreco" ADD CONSTRAINT "FaixaPreco_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoEmpresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioPortal" ADD CONSTRAINT "UsuarioPortal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "EmpresaCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoPortal" ADD CONSTRAINT "SolicitacaoPortal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "EmpresaCliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoPortal" ADD CONSTRAINT "SolicitacaoPortal_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoEmpresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoPortal" ADD CONSTRAINT "SolicitacaoPortal_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "UnidadeEmpresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoPortal" ADD CONSTRAINT "SolicitacaoPortal_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "UsuarioPortal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoPortal" ADD CONSTRAINT "SolicitacaoPortal_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
