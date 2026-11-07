-- AlterTable
ALTER TABLE "ConfigWhatsapp" ADD COLUMN     "appId" TEXT,
ADD COLUMN     "embeddedSignupConfigId" TEXT;

-- AlterTable
ALTER TABLE "NumeroWhatsapp" ADD COLUMN     "coexistencia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coexistenciaAtivadoEm" TIMESTAMP(3),
ADD COLUMN     "historicoErro" TEXT,
ADD COLUMN     "historicoProgresso" INTEGER,
ADD COLUMN     "historicoSolicitadoEm" TIMESTAMP(3),
ADD COLUMN     "historicoStatus" TEXT,
ADD COLUMN     "wabaId" TEXT;
