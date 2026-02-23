-- Enable UUID extension if not already (e.g. users table may already use it)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add UUID column for LGPD: non-enumerable identifier in URLs/APIs
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "uuid" UUID UNIQUE DEFAULT uuid_generate_v4();

-- Backfill existing rows (PostgreSQL sets DEFAULT on add, but explicit update for safety)
UPDATE "pacientes" SET "uuid" = uuid_generate_v4() WHERE "uuid" IS NULL;

-- Index for lookups by UUID (Prisma uses pacientes_uuid_key for unique; idx for queries)
CREATE UNIQUE INDEX IF NOT EXISTS "pacientes_uuid_key" ON "pacientes"("uuid");
CREATE INDEX IF NOT EXISTS "idx_pacientes_uuid" ON "pacientes"("uuid");
