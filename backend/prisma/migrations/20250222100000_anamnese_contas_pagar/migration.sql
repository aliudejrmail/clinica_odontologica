-- CreateTable
CREATE TABLE "anamnese_perguntas" (
    "id" SERIAL NOT NULL,
    "clinica_id" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "pergunta" VARCHAR(500) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "ativo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anamnese_perguntas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_anamnese_perguntas_clinica" ON "anamnese_perguntas"("clinica_id");

-- CreateTable
CREATE TABLE "anamnese_respostas" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "pergunta_id" INTEGER NOT NULL,
    "valor" TEXT,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anamnese_respostas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unique_anamnese_paciente_pergunta" ON "anamnese_respostas"("paciente_id", "pergunta_id");
CREATE INDEX "idx_anamnese_respostas_paciente" ON "anamnese_respostas"("paciente_id");

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" SERIAL NOT NULL,
    "clinica_id" INTEGER NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "pago_em" DATE,
    "status" VARCHAR(20) NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_contas_pagar_clinica" ON "contas_pagar"("clinica_id");
CREATE INDEX "idx_contas_pagar_vencimento" ON "contas_pagar"("vencimento");
