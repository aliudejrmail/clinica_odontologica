-- LGPD: suportar CPF criptografado (aplicação usa criptografia determinística)
-- Valores existentes permanecem em texto claro até rodar script de migração
ALTER TABLE "pacientes" ALTER COLUMN "cpf" TYPE VARCHAR(128);
ALTER TABLE "pacientes" ALTER COLUMN "responsavel_cpf" TYPE VARCHAR(128);
