-- CreateEnum
CREATE TYPE "StatusConversa" AS ENUM ('ABERTA', 'EM_ESPERA', 'FECHADA');

-- CreateEnum
CREATE TYPE "CanalConversa" AS ENUM ('WHATSAPP', 'EMAIL', 'TELEFONE', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoMensagem" AS ENUM ('TEXTO', 'AUDIO', 'IMAGEM', 'VIDEO', 'DOCUMENTO', 'SISTEMA', 'OUTRO');

-- CreateSequence
CREATE SEQUENCE "conversa_numero_seq" START WITH 1 INCREMENT BY 1 MINVALUE 1;

-- CreateTable
CREATE TABLE "Conversa" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "status" "StatusConversa" NOT NULL DEFAULT 'ABERTA',
    "canal" "CanalConversa" NOT NULL,
    "processoId" TEXT,
    "contatoId" TEXT,
    "responsavelId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "ultimaMensagemEm" TIMESTAMP(3),
    "fechadaEm" TIMESTAMP(3),
    "ultimaMensagem" TEXT,
    "naoLida" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Conversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "canal" "CanalConversa" NOT NULL,
    "direcao" "DirecaoMensagem" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "remetente" TEXT,
    "tipo" "TipoMensagem" NOT NULL DEFAULT 'TEXTO',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idExterno" TEXT,
    "mensagemWhatsappId" TEXT,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ConversaWhatsapp" ADD COLUMN "conversaId" TEXT;

-- Backfill existing WhatsApp threads. Rows stay; this only adds the generic mirror.
INSERT INTO "Conversa" (
    "id", "numero", "status", "canal", "processoId", "contatoId", "responsavelId",
    "criadoEm", "atualizadoEm", "ultimaMensagemEm", "ultimaMensagem", "naoLida"
)
SELECT
    c."id",
    'A' || lpad(nextval('conversa_numero_seq')::text, 5, '0'),
    'ABERTA',
    'WHATSAPP',
    c."processoId",
    c."contatoId",
    c."responsavelId",
    c."criadoEm",
    c."atualizadoEm",
    c."ultimaMensagemEm",
    c."ultimaMensagem",
    c."naoLida"
FROM "ConversaWhatsapp" c;

UPDATE "ConversaWhatsapp" SET "conversaId" = "id" WHERE "conversaId" IS NULL AND EXISTS (SELECT 1 FROM "Conversa" WHERE "Conversa"."id" = "ConversaWhatsapp"."id");

INSERT INTO "Mensagem" (
    "id", "conversaId", "canal", "direcao", "conteudo", "remetente", "tipo", "criadaEm", "idExterno", "mensagemWhatsappId"
)
SELECT
    m."id",
    w."conversaId",
    'WHATSAPP',
    m."direcao",
    COALESCE(NULLIF(m."texto", ''), CASE m."tipo" WHEN 'AUDIO' THEN '[áudio]' WHEN 'IMAGEM' THEN '[imagem]' WHEN 'VIDEO' THEN '[vídeo]' WHEN 'DOCUMENTO' THEN '[documento]' ELSE '[mensagem]' END),
    CASE WHEN m."direcao" = 'ENTRADA' THEN w."nomeContato" ELSE 'Mude Bem' END,
    CASE m."tipo"
        WHEN 'TEXTO' THEN 'TEXTO'::"TipoMensagem"
        WHEN 'AUDIO' THEN 'AUDIO'::"TipoMensagem"
        WHEN 'IMAGEM' THEN 'IMAGEM'::"TipoMensagem"
        WHEN 'VIDEO' THEN 'VIDEO'::"TipoMensagem"
        WHEN 'DOCUMENTO' THEN 'DOCUMENTO'::"TipoMensagem"
        ELSE 'OUTRO'::"TipoMensagem"
    END,
    m."criadaEm",
    m."wamid",
    m."id"
FROM "MensagemWhatsapp" m
JOIN "ConversaWhatsapp" w ON w."id" = m."conversaId"
WHERE w."conversaId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Conversa_numero_key" ON "Conversa"("numero");
CREATE INDEX "Conversa_processoId_idx" ON "Conversa"("processoId");
CREATE INDEX "Conversa_status_ultimaMensagemEm_idx" ON "Conversa"("status", "ultimaMensagemEm");
CREATE INDEX "Conversa_naoLida_idx" ON "Conversa"("naoLida");
CREATE UNIQUE INDEX "Mensagem_mensagemWhatsappId_key" ON "Mensagem"("mensagemWhatsappId");
CREATE INDEX "Mensagem_conversaId_criadaEm_idx" ON "Mensagem"("conversaId", "criadaEm");
CREATE INDEX "Mensagem_idExterno_idx" ON "Mensagem"("idExterno");
CREATE UNIQUE INDEX "ConversaWhatsapp_conversaId_key" ON "ConversaWhatsapp"("conversaId");

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "Conversa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_mensagemWhatsappId_fkey" FOREIGN KEY ("mensagemWhatsappId") REFERENCES "MensagemWhatsapp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversaWhatsapp" ADD CONSTRAINT "ConversaWhatsapp_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "Conversa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
