-- DropIndex
DROP INDEX "Cte_processoId_key";

-- AlterTable
ALTER TABLE "Cte" ADD COLUMN     "classificacaoTributaria" TEXT,
ADD COLUMN     "contribuicaoTomador" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN     "finalidade" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "indicadorTomador" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mensagemProvedor" TEXT,
ADD COLUMN     "partilhaIcms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pedidoPreparado" JSONB,
ADD COLUMN     "rascunho" JSONB,
ADD COLUMN     "regimeTributario" TEXT,
ADD COLUMN     "tipoServico" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uuidProvedor" TEXT;

-- CreateTable
CREATE TABLE "Mdfe" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVISTO',
    "cteChaves" JSONB,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mdfe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mdfe_processoId_idx" ON "Mdfe"("processoId");

-- CreateIndex
CREATE INDEX "Cte_processoId_idx" ON "Cte"("processoId");

-- CreateIndex
CREATE INDEX "Cte_chave_idx" ON "Cte"("chave");

-- AddForeignKey
ALTER TABLE "Mdfe" ADD CONSTRAINT "Mdfe_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
