-- AlterTable: adicionar colunas para odontograma por dente (dente_num, estado, faces, etc.)
ALTER TABLE "odontogramas" ALTER COLUMN "dentista_id" DROP NOT NULL;
ALTER TABLE "odontogramas" ALTER COLUMN "data_avaliacao" DROP NOT NULL;
ALTER TABLE "odontogramas" ALTER COLUMN "estado_dentes" DROP NOT NULL;

ALTER TABLE "odontogramas" ADD COLUMN IF NOT EXISTS "dente_num" VARCHAR(10);
ALTER TABLE "odontogramas" ADD COLUMN IF NOT EXISTS "estado" VARCHAR(50);
ALTER TABLE "odontogramas" ADD COLUMN IF NOT EXISTS "faces" JSONB;
ALTER TABLE "odontogramas" ADD COLUMN IF NOT EXISTS "data_registro" TIMESTAMP(6);
ALTER TABLE "odontogramas" ADD COLUMN IF NOT EXISTS "criado_por" UUID;

CREATE INDEX IF NOT EXISTS "idx_odontogramas_paciente_dente" ON "odontogramas"("paciente_id", "dente_num");
