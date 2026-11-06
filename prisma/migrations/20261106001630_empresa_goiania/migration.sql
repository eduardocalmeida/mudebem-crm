-- AlterTable
ALTER TABLE "Nfse" ADD COLUMN     "prestadorIbge" TEXT,
ADD COLUMN     "prestadorMunicipio" TEXT,
ADD COLUMN     "prestadorUf" TEXT;

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL DEFAULT 'padrao',
    "nome" TEXT,
    "cnpj" TEXT,
    "ie" TEXT,
    "municipio" TEXT NOT NULL DEFAULT 'Goiânia',
    "uf" TEXT NOT NULL DEFAULT 'GO',
    "codigoIbge" TEXT NOT NULL DEFAULT '5208707',
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);
