-- Habilitar extensão UUID no PostgreSQL (necessária para uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "clinicas" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "cnpj" VARCHAR(14),
    "telefone" VARCHAR(20),
    "endereco" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "clinica_id" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" SERIAL NOT NULL,
    "clinica_id" INTEGER NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "telefone" VARCHAR(20),
    "email" VARCHAR(255),
    "endereco" TEXT,
    "responsavel_nome" VARCHAR(255),
    "responsavel_cpf" VARCHAR(11),
    "responsavel_telefone" VARCHAR(20),
    "observacoes" TEXT,
    "ativo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dentistas" (
    "id" SERIAL NOT NULL,
    "clinica_id" INTEGER NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "cro" VARCHAR(50) NOT NULL,
    "especialidade" VARCHAR(100),
    "telefone" VARCHAR(20),
    "email" VARCHAR(255),
    "ativo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dentistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas" (
    "id" SERIAL NOT NULL,
    "clinica_id" INTEGER NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "dentista_id" INTEGER NOT NULL,
    "data_hora" TIMESTAMP(6) NOT NULL,
    "duracao_minutos" INTEGER DEFAULT 60,
    "status" VARCHAR(50) NOT NULL,
    "tipo_consulta" VARCHAR(100) NOT NULL,
    "observacoes" TEXT,
    "valor_total" DECIMAL(10,2),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedimentos" (
    "id" SERIAL NOT NULL,
    "clinica_id" INTEGER NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "valor_base" DECIMAL(10,2),
    "ativo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consulta_procedimentos" (
    "id" SERIAL NOT NULL,
    "consulta_id" INTEGER NOT NULL,
    "procedimento_id" INTEGER NOT NULL,
    "dente_numero" INTEGER,
    "face" VARCHAR(10),
    "quantidade" INTEGER DEFAULT 1,
    "valor_unitario" DECIMAL(10,2),
    "valor_total" DECIMAL(10,2),
    "observacoes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consulta_procedimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odontogramas" (
    "id" SERIAL NOT NULL,
    "clinica_id" INTEGER NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "dentista_id" INTEGER NOT NULL,
    "data_avaliacao" DATE NOT NULL,
    "estado_dentes" JSONB NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odontogramas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" SERIAL NOT NULL,
    "clinica_id" INTEGER NOT NULL,
    "consulta_id" INTEGER NOT NULL,
    "forma_pagamento" VARCHAR(50) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_pagamento" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "parcelas" INTEGER DEFAULT 1,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_procedures" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "appointment_id" UUID,
    "procedure_id" UUID,
    "quantity" INTEGER DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "tooth_number" VARCHAR(10),
    "face" VARCHAR(20),

    CONSTRAINT "appointment_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "patient_id" UUID,
    "professional_id" UUID,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'SCHEDULED',
    "observations" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "table_name" VARCHAR(50),
    "record_id" UUID,
    "action" VARCHAR(20),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_records" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "appointment_id" UUID,
    "patient_id" UUID,
    "professional_id" UUID,
    "subject" TEXT,
    "evolution" TEXT NOT NULL,
    "prescription" TEXT,
    "attachments" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "appointment_id" UUID,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(150) NOT NULL,
    "cnpj" VARCHAR(18),
    "copay_percentage" DECIMAL(5,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "health_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "transaction_id" UUID,
    "invoice_number" VARCHAR(50),
    "access_key" VARCHAR(44),
    "series" VARCHAR(10),
    "issued_at" TIMESTAMPTZ(6),
    "xml_path" VARCHAR(500),
    "pdf_path" VARCHAR(500),
    "status" VARCHAR(50) DEFAULT 'NOT_ISSUED',
    "email_sent" BOOLEAN DEFAULT false,
    "email_sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "patient_id" UUID,
    "health_plan_id" UUID,
    "card_number" VARCHAR(100),
    "validity_date" DATE,
    "is_primary" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "full_name" VARCHAR(255) NOT NULL,
    "cpf" VARCHAR(14) NOT NULL,
    "birth_date" DATE NOT NULL,
    "gender" VARCHAR(20),
    "phone_primary" VARCHAR(20),
    "phone_secondary" VARCHAR(20),
    "email" VARCHAR(255),
    "address_street" VARCHAR(255),
    "address_number" VARCHAR(20),
    "address_complement" VARCHAR(50),
    "address_city" VARCHAR(100),
    "address_state" VARCHAR(2),
    "address_zipcode" VARCHAR(10),
    "emergency_contact_name" VARCHAR(255),
    "emergency_contact_phone" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "transaction_id" UUID,
    "payment_method" VARCHAR(50) NOT NULL,
    "provider_reference" VARCHAR(255),
    "installment_count" INTEGER DEFAULT 1,
    "amount" DECIMAL(10,2) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "status" VARCHAR(50) DEFAULT 'PENDING',

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures_catalog" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "duration_minutes" INTEGER DEFAULT 30,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "procedures_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "full_name" VARCHAR(255) NOT NULL,
    "cro_number" VARCHAR(50),
    "cro_state" VARCHAR(2),
    "speciality" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_cnpj_key" ON "clinicas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_cpf_key" ON "pacientes"("cpf");

-- CreateIndex
CREATE INDEX "idx_pacientes_clinica" ON "pacientes"("clinica_id");

-- CreateIndex
CREATE INDEX "idx_pacientes_clinica_id" ON "pacientes"("clinica_id");

-- CreateIndex
CREATE INDEX "idx_pacientes_cpf" ON "pacientes"("cpf");

-- CreateIndex
CREATE INDEX "idx_dentistas_clinica_id" ON "dentistas"("clinica_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_cro_clinica" ON "dentistas"("cro", "clinica_id");

-- CreateIndex
CREATE INDEX "idx_consultas_clinica" ON "consultas"("clinica_id");

-- CreateIndex
CREATE INDEX "idx_consultas_dentista" ON "consultas"("dentista_id");

-- CreateIndex
CREATE INDEX "idx_consultas_paciente" ON "consultas"("paciente_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_codigo_clinica" ON "procedimentos"("codigo", "clinica_id");

-- CreateIndex
CREATE INDEX "idx_consulta_procedimentos_consulta" ON "consulta_procedimentos"("consulta_id");

-- CreateIndex
CREATE INDEX "idx_odontogramas_paciente" ON "odontogramas"("paciente_id");

-- CreateIndex
CREATE INDEX "idx_pagamentos_consulta" ON "pagamentos"("consulta_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_cpf_key" ON "patients"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_catalog_code_key" ON "procedures_catalog"("code");
