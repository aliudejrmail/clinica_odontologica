-- Índice composto para buscas frequentes: listagem por clínica + filtro por status + ordenação por data_hora
CREATE INDEX IF NOT EXISTS "idx_consultas_clinica_status_data" ON "consultas"("clinica_id", "status", "data_hora");
