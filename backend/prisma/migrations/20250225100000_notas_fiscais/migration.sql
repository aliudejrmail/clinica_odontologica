-- Tabela para emissão de NF-e/NFS-e: chave de acesso, XML, PDF
CREATE TABLE "notas_fiscais" (
    "id" SERIAL NOT NULL,
    "clinica_id" INTEGER NOT NULL,
    "pagamento_id" INTEGER NOT NULL,
    "numero" VARCHAR(20),
    "serie" VARCHAR(10),
    "chave_acesso" VARCHAR(44),
    "xml_path" VARCHAR(500),
    "pdf_path" VARCHAR(500),
    "data_emissao" TIMESTAMP(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'rascunho',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_fiscais_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_notas_fiscais_clinica" ON "notas_fiscais"("clinica_id");
CREATE INDEX "idx_notas_fiscais_pagamento" ON "notas_fiscais"("pagamento_id");
CREATE INDEX "idx_notas_fiscais_chave" ON "notas_fiscais"("chave_acesso");
CREATE UNIQUE INDEX "idx_notas_fiscais_numero_serie" ON "notas_fiscais"("clinica_id", "numero", "serie") WHERE "numero" IS NOT NULL AND "serie" IS NOT NULL;

COMMENT ON TABLE "notas_fiscais" IS 'NF-e/NFS-e: chave de acesso, caminhos XML/PDF';
COMMENT ON COLUMN "notas_fiscais"."chave_acesso" IS 'Chave de acesso da NF-e (44 dígitos)';
COMMENT ON COLUMN "notas_fiscais"."xml_path" IS 'Caminho do arquivo XML da nota';
COMMENT ON COLUMN "notas_fiscais"."pdf_path" IS 'Caminho do DANFE/PDF da nota';
COMMENT ON COLUMN "notas_fiscais"."status" IS 'rascunho | emitida | cancelada | erro';
