-- AlterTable
ALTER TABLE "EtapaPipeline" ALTER COLUMN "atualizadoEm" DROP DEFAULT;

-- CreateTable
CREATE TABLE "TipoTarefa" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoTarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraTarefa" (
    "id" TEXT NOT NULL,
    "etapaSlug" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "horasDepois" INTEGER NOT NULL DEFAULT 24,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RegraTarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "responsavelId" TEXT,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "concluidaEm" TIMESTAMP(3),
    "automatica" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCatalogo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "volumeM3" DECIMAL(8,3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ItemCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemInventario" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "catalogoId" TEXT,
    "nome" TEXT NOT NULL,
    "comodo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "volumeUnitario" DECIMAL(8,3) NOT NULL,
    "fragil" BOOLEAN NOT NULL DEFAULT false,
    "desmontagem" BOOLEAN NOT NULL DEFAULT false,
    "embalagem" BOOLEAN NOT NULL DEFAULT false,
    "personalizado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cte" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "emitenteNome" TEXT,
    "emitenteDocumento" TEXT,
    "emitenteIe" TEXT,
    "emitenteMunicipio" TEXT,
    "emitenteUf" TEXT,
    "remetenteNome" TEXT,
    "remetenteDocumento" TEXT,
    "remetenteMunicipio" TEXT,
    "remetenteUf" TEXT,
    "destinatarioNome" TEXT,
    "destinatarioDocumento" TEXT,
    "destinatarioMunicipio" TEXT,
    "destinatarioUf" TEXT,
    "expedidorNome" TEXT,
    "expedidorDocumento" TEXT,
    "recebedorNome" TEXT,
    "recebedorDocumento" TEXT,
    "tomador" TEXT NOT NULL DEFAULT 'REMETENTE',
    "cfop" TEXT,
    "naturezaOperacao" TEXT,
    "modal" TEXT NOT NULL DEFAULT '01',
    "municipioInicio" TEXT,
    "ufInicio" TEXT,
    "municipioFim" TEXT,
    "ufFim" TEXT,
    "valorPrestacao" DECIMAL(12,2),
    "componentes" JSONB,
    "icmsCst" TEXT,
    "icmsBase" DECIMAL(12,2),
    "icmsAliquota" DECIMAL(6,2),
    "icmsValor" DECIMAL(12,2),
    "produtoPredominante" TEXT,
    "valorCarga" DECIMAL(12,2),
    "quantidadeCarga" DECIMAL(12,3),
    "unidadeCarga" TEXT DEFAULT 'M3',
    "rntrc" TEXT,
    "documentos" JSONB,
    "chave" TEXT,
    "numero" TEXT,
    "serie" TEXT,
    "xmlUrl" TEXT,
    "dacteUrl" TEXT,
    "provedor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoTarefa_slug_key" ON "TipoTarefa"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RegraTarefa_etapaSlug_tipoId_key" ON "RegraTarefa"("etapaSlug", "tipoId");

-- CreateIndex
CREATE INDEX "Tarefa_vencimento_idx" ON "Tarefa"("vencimento");

-- CreateIndex
CREATE INDEX "Tarefa_responsavelId_idx" ON "Tarefa"("responsavelId");

-- CreateIndex
CREATE INDEX "Tarefa_processoId_idx" ON "Tarefa"("processoId");

-- CreateIndex
CREATE UNIQUE INDEX "Cte_processoId_key" ON "Cte"("processoId");

-- AddForeignKey
ALTER TABLE "RegraTarefa" ADD CONSTRAINT "RegraTarefa_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoTarefa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoTarefa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInventario" ADD CONSTRAINT "ItemInventario_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInventario" ADD CONSTRAINT "ItemInventario_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "ItemCatalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cte" ADD CONSTRAINT "Cte_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
