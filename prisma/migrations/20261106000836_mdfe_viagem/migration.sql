/*
  Warnings:

  - You are about to drop the column `cteChaves` on the `Mdfe` table. All the data in the column will be lost.
  - You are about to drop the column `observacao` on the `Mdfe` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Mdfe" DROP COLUMN "cteChaves",
DROP COLUMN "observacao",
ADD COLUMN     "apolice" TEXT,
ADD COLUMN     "averbacao" TEXT,
ADD COLUMN     "capacidadeKg" INTEGER,
ADD COLUMN     "capacidadeM3" INTEGER,
ADD COLUMN     "chave" TEXT,
ADD COLUMN     "condutorCpf" TEXT,
ADD COLUMN     "condutorNome" TEXT,
ADD COLUMN     "damdfeUrl" TEXT,
ADD COLUMN     "mensagemProvedor" TEXT,
ADD COLUMN     "modalidade" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "municipioCarregamento" TEXT,
ADD COLUMN     "municipioDescarregamento" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "pedidoPreparado" JSONB,
ADD COLUMN     "percurso" TEXT,
ADD COLUMN     "pesoBruto" DECIMAL(12,4),
ADD COLUMN     "placa" TEXT,
ADD COLUMN     "renavam" TEXT,
ADD COLUMN     "rntrc" TEXT,
ADD COLUMN     "seguradoraCnpj" TEXT,
ADD COLUMN     "seguradoraNome" TEXT,
ADD COLUMN     "serie" TEXT,
ADD COLUMN     "taraKg" INTEGER,
ADD COLUMN     "ufFim" TEXT,
ADD COLUMN     "ufInicio" TEXT,
ADD COLUMN     "uuidProvedor" TEXT,
ADD COLUMN     "valorCarga" DECIMAL(12,2),
ADD COLUMN     "xmlUrl" TEXT,
ALTER COLUMN "status" SET DEFAULT 'RASCUNHO';

-- CreateTable
CREATE TABLE "MdfeCte" (
    "id" TEXT NOT NULL,
    "mdfeId" TEXT NOT NULL,
    "cteId" TEXT NOT NULL,

    CONSTRAINT "MdfeCte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MdfeCte_mdfeId_cteId_key" ON "MdfeCte"("mdfeId", "cteId");

-- CreateIndex
CREATE INDEX "Mdfe_chave_idx" ON "Mdfe"("chave");

-- AddForeignKey
ALTER TABLE "MdfeCte" ADD CONSTRAINT "MdfeCte_mdfeId_fkey" FOREIGN KEY ("mdfeId") REFERENCES "Mdfe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdfeCte" ADD CONSTRAINT "MdfeCte_cteId_fkey" FOREIGN KEY ("cteId") REFERENCES "Cte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
