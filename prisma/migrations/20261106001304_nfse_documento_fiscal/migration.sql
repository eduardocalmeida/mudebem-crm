-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "documentoFiscal" TEXT,
ADD COLUMN     "documentoFiscalManual" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CodigoServicoNfse" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "cnae" TEXT,
    "aliquotaIss" DECIMAL(6,2),
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CodigoServicoNfse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nfse" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "prestadorNome" TEXT,
    "prestadorDocumento" TEXT,
    "tomadorNome" TEXT,
    "tomadorDocumento" TEXT,
    "tomadorEmail" TEXT,
    "tomadorEndereco" TEXT,
    "tomadorNumero" TEXT,
    "tomadorBairro" TEXT,
    "tomadorCidade" TEXT,
    "tomadorUf" TEXT,
    "tomadorCep" TEXT,
    "municipioPrestacao" TEXT,
    "ufPrestacao" TEXT,
    "discriminacao" TEXT,
    "codigoServico" TEXT,
    "cnae" TEXT,
    "aliquotaIss" DECIMAL(6,2),
    "valorIss" DECIMAL(12,2),
    "issRetido" BOOLEAN NOT NULL DEFAULT false,
    "aliquotaPis" DECIMAL(6,2),
    "aliquotaCofins" DECIMAL(6,2),
    "aliquotaCsll" DECIMAL(6,2),
    "aliquotaIr" DECIMAL(6,2),
    "aliquotaInss" DECIMAL(6,2),
    "valorServicos" DECIMAL(12,2),
    "deducoes" DECIMAL(12,2),
    "ibsSituacao" TEXT,
    "ibsClassificacao" TEXT,
    "numero" TEXT,
    "codigoVerificacao" TEXT,
    "serieRps" TEXT,
    "numeroRps" TEXT,
    "uuidProvedor" TEXT,
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "pedidoPreparado" JSONB,
    "mensagemProvedor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nfse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodigoServicoNfse_codigo_key" ON "CodigoServicoNfse"("codigo");

-- CreateIndex
CREATE INDEX "Nfse_processoId_idx" ON "Nfse"("processoId");

-- CreateIndex
CREATE INDEX "Nfse_uuidProvedor_idx" ON "Nfse"("uuidProvedor");

-- AddForeignKey
ALTER TABLE "Nfse" ADD CONSTRAINT "Nfse_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
