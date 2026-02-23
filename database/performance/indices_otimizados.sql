-- Índices Otimizados para Clínica Odontológica
-- Performance crítica para consultas frequentes

-- ===== ÍNDICES PARA TABELAS PRINCIPAIS =====

-- Pacientes - Buscas por CPF e nome
CREATE INDEX CONCURRENTLY idx_pacientes_cpf ON pacientes(cpf);
CREATE INDEX CONCURRENTLY idx_pacientes_nome_trgm ON pacientes USING gin (nome gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_pacientes_clinica_ativo ON pacientes(clinica_id, ativo) WHERE ativo = true;
CREATE INDEX CONCURRENTLY idx_pacientes_data_nascimento ON pacientes(data_nascimento);

-- Dentistas - Buscas por CRO e especialidade
CREATE INDEX CONCURRENTLY idx_dentistas_cro ON dentistas(cro);
CREATE INDEX CONCURRENTLY idx_dentistas_especialidade ON dentistas(especialidade);
CREATE INDEX CONCURRENTLY idx_dentistas_clinica_ativo ON dentistas(clinica_id, ativo) WHERE ativo = true;

-- Consultas - Buscas por data e status (crítico para agenda)
CREATE INDEX CONCURRENTLY idx_consultas_data_hora ON consultas(data_hora);
CREATE INDEX CONCURRENTLY idx_consultas_data_hora_range ON consultas(data_hora DESC, duracao_minutos);
CREATE INDEX CONCURRENTLY idx_consultas_paciente_data ON consultas(paciente_id, data_hora DESC);
CREATE INDEX CONCURRENTLY idx_consultas_dentista_data ON consultas(dentista_id, data_hora);
CREATE INDEX CONCURRENTLY idx_consultas_status ON consultas(status) WHERE status IN ('agendada', 'confirmada', 'em_andamento');
CREATE INDEX CONCURRENTLY idx_consultas_clinica_data ON consultas(clinica_id, data_hora DESC);

-- Procedimentos - Buscas por código
CREATE INDEX CONCURRENTLY idx_procedimentos_codigo ON procedimentos(codigo);
CREATE INDEX CONCURRENTLY idx_procedimentos_clinica_ativo ON procedimentos(clinica_id, ativo) WHERE ativo = true;

-- Consulta_procedimentos - Buscas por dente e procedimento
CREATE INDEX CONCURRENTLY idx_consulta_procedimentos_consulta ON consulta_procedimentos(consulta_id);
CREATE INDEX CONCURRENTLY idx_consulta_procedimentos_procedimento ON consulta_procedimentos(procedimento_id);
CREATE INDEX CONCURRENTLY idx_consulta_procedimentos_dente ON consulta_procedimentos(dente_numero);
CREATE INDEX CONCURRENTLY idx_consulta_procedimentos_dente_face ON consulta_procedimentos(dente_numero, face);

-- Odontogramas - Buscas por paciente e data
CREATE INDEX CONCURRENTLY idx_odontogramas_paciente_data ON odontogramas(paciente_id, data_avaliacao DESC);
CREATE INDEX CONCURRENTLY idx_odontogramas_dentista ON odontogramas(dentista_id);
CREATE INDEX CONCURRENTLY idx_odontogramas_clinica ON odontogramas(clinica_id);

-- Pagamentos - Buscas por consulta e data
CREATE INDEX CONCURRENTLY idx_pagamentos_consulta ON pagamentos(consulta_id);
CREATE INDEX CONCURRENTLY idx_pagamentos_data_pagamento ON pagamentos(data_pagamento DESC);
CREATE INDEX CONCURRENTLY idx_pagamentos_forma ON pagamentos(forma_pagamento);

-- ===== ÍNDICES PARA RLS (SEGURANÇA) =====
-- Esses índices são críticos para performance com RLS habilitado

CREATE INDEX CONCURRENTLY idx_clinica_id ON clinicas(id);
CREATE INDEX CONCURRENTLY idx_pacientes_clinica_id ON pacientes(clinica_id);
CREATE INDEX CONCURRENTLY idx_dentistas_clinica_id ON dentistas(clinica_id);
CREATE INDEX CONCURRENTLY idx_consultas_clinica_dentista ON consultas(clinica_id, dentista_id);
CREATE INDEX CONCURRENTLY idx_procedimentos_clinica_id ON procedimentos(clinica_id);
CREATE INDEX CONCURRENTLY idx_odontogramas_clinica_id ON odontogramas(clinica_id);
CREATE INDEX CONCURRENTLY idx_pagamentos_clinica_id ON pagamentos(clinica_id);

-- ===== ÍNDICES COMPOSITOS PARA CONSULTAS COMPLEXAS =====

-- Agenda do dentista (consultas do dia)
CREATE INDEX CONCURRENTLY idx_consultas_agenda_dia ON consultas(
    dentista_id, 
    DATE(data_hora), 
    data_hora, 
    status
) WHERE status NOT IN ('cancelada', 'nao_compareceu');

-- Histórico do paciente (últimas consultas)
CREATE INDEX CONCURRENTLY idx_consultas_historico ON consultas(
    paciente_id, 
    data_hora DESC
) INCLUDE (dentista_id, status, tipo_consulta);

-- Relatório financeiro por período
CREATE INDEX CONCURRENTLY idx_consultas_financeiro ON consultas(
    clinica_id, 
    DATE(data_hora), 
    status
) WHERE status = 'concluida';

-- Procedimentos por dentista no mês
CREATE INDEX CONCURRENTLY idx_consulta_procedimentos_mes ON consulta_procedimentos(
    procedimento_id, 
    created_at
) INCLUDE (consulta_id, dente_numero, quantidade);

-- ===== ÍNDICES PARA JSONB (ODONTOGRAMA) =====

-- Índices GIN para campos JSONB
CREATE INDEX CONCURRENTLY idx_odontogramas_estado_dentes_gin ON odontogramas USING gin (estado_dentes);
CREATE INDEX CONCURRENTLY idx_odontogramas_estado_dentes_jsonpath ON odontogramas USING gin ((estado_dentes->'dentes'));

-- Índices para buscas específicas no JSONB
-- Buscar dentes com cárie
CREATE INDEX CONCURRENTLY idx_odontogramas_dente_carie ON odontogramas 
USING gin ((estado_dentes->'dentes')) 
WHERE estado_dentes->'dentes' @> '[{"estado": "cariado"}]'::jsonb;

-- ===== ÍNDICES PARA FULL-TEXT SEARCH =====

-- Buscas por nome de paciente (similaridade)
CREATE INDEX CONCURRENTLY idx_pacientes_nome_search ON pacientes 
USING gin (to_tsvector('portuguese', nome || ' ' || COALESCE(email, '')));

-- Buscas por observações
CREATE INDEX CONCURRENTLY idx_consultas_observacoes_search ON consultas 
USING gin (to_tsvector('portuguese', observacoes));

-- ===== ÍNDICES PARA OTIMIZAÇÃO DE JOIN =====

-- Índices para foreign keys (melhoram joins)
CREATE INDEX CONCURRENTLY idx_consultas_paciente_fk ON consultas(paciente_id);
CREATE INDEX CONCURRENTLY idx_consultas_dentista_fk ON consultas(dentista_id);
CREATE INDEX CONCURRENTLY idx_consulta_procedimentos_consulta_fk ON consulta_procedimentos(consulta_id);
CREATE INDEX CONCURRENTLY idx_consulta_procedimentos_procedimento_fk ON consulta_procedimentos(procedimento_id);
CREATE INDEX CONCURRENTLY idx_pagamentos_consulta_fk ON pagamentos(consulta_id);

-- ===== ÍNDICES PARA AGRUPAMENTO E RELATÓRIOS =====

-- Relatório de produção por dentista
CREATE INDEX CONCURRENTLY idx_consultas_producao ON consultas(
    clinica_id, 
    dentista_id, 
    DATE(data_hora), 
    status
) WHERE status = 'concluida';

-- Relatório de pacientes por faixa etária
CREATE INDEX CONCURRENTLY idx_pacientes_idade ON pacientes(
    clinica_id, 
    data_nascimento
) INCLUDE (nome, cpf);

-- ===== COMANDOS PARA VERIFICAR PERFORMANCE =====

-- Verificar uso de índices
/*
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM consultas 
WHERE dentista_id = 1 
AND data_hora >= '2024-01-01' 
AND status = 'agendada';
*/

-- Verificar tamanho dos índices
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
*/

-- Verificar índices não utilizados
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 
AND idx_tup_fetch = 0;
*/