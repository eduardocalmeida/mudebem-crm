-- CreateEnum
CREATE TYPE "DirecaoMensagem" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "TipoMensagemWhatsapp" AS ENUM ('TEXTO', 'IMAGEM', 'AUDIO', 'VIDEO', 'DOCUMENTO', 'FIGURINHA', 'LOCALIZACAO', 'MODELO', 'INTERATIVA', 'DESCONHECIDO');

-- CreateEnum
CREATE TYPE "StatusMensagemWhatsapp" AS ENUM ('RECEBIDA', 'ENVIADA', 'ENTREGUE', 'LIDA', 'FALHOU');

-- CreateTable
CREATE TABLE "ConfigWhatsapp" (
    "id" TEXT NOT NULL DEFAULT 'padrao',
    "verifyToken" TEXT,
    "appSecret" TEXT,
    "accessToken" TEXT,
    "wabaId" TEXT,
    "apiVersion" TEXT NOT NULL DEFAULT 'v21.0',
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigWhatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumeroWhatsapp" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "numeroExibicao" TEXT NOT NULL,
    "accessToken" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "exemplo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumeroWhatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversaWhatsapp" (
    "id" TEXT NOT NULL,
    "numeroId" TEXT NOT NULL,
    "waId" TEXT NOT NULL,
    "nomeContato" TEXT,
    "contatoId" TEXT,
    "processoId" TEXT,
    "responsavelId" TEXT,
    "naoLida" BOOLEAN NOT NULL DEFAULT true,
    "ultimaMensagem" TEXT,
    "ultimaMensagemEm" TIMESTAMP(3),
    "ultimaEntradaEm" TIMESTAMP(3),
    "exemplo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversaWhatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemWhatsapp" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "wamid" TEXT,
    "direcao" "DirecaoMensagem" NOT NULL,
    "tipo" "TipoMensagemWhatsapp" NOT NULL,
    "texto" TEXT,
    "midiaId" TEXT,
    "midiaMime" TEXT,
    "midiaNome" TEXT,
    "status" "StatusMensagemWhatsapp" NOT NULL,
    "erro" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL,
    "registradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemWhatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NumeroWhatsapp_phoneNumberId_key" ON "NumeroWhatsapp"("phoneNumberId");

-- CreateIndex
CREATE INDEX "ConversaWhatsapp_naoLida_idx" ON "ConversaWhatsapp"("naoLida");

-- CreateIndex
CREATE INDEX "ConversaWhatsapp_ultimaMensagemEm_idx" ON "ConversaWhatsapp"("ultimaMensagemEm");

-- CreateIndex
CREATE UNIQUE INDEX "ConversaWhatsapp_numeroId_waId_key" ON "ConversaWhatsapp"("numeroId", "waId");

-- CreateIndex
CREATE UNIQUE INDEX "MensagemWhatsapp_wamid_key" ON "MensagemWhatsapp"("wamid");

-- CreateIndex
CREATE INDEX "MensagemWhatsapp_conversaId_criadaEm_idx" ON "MensagemWhatsapp"("conversaId", "criadaEm");

-- AddForeignKey
ALTER TABLE "ConversaWhatsapp" ADD CONSTRAINT "ConversaWhatsapp_numeroId_fkey" FOREIGN KEY ("numeroId") REFERENCES "NumeroWhatsapp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversaWhatsapp" ADD CONSTRAINT "ConversaWhatsapp_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversaWhatsapp" ADD CONSTRAINT "ConversaWhatsapp_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversaWhatsapp" ADD CONSTRAINT "ConversaWhatsapp_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemWhatsapp" ADD CONSTRAINT "MensagemWhatsapp_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "ConversaWhatsapp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
