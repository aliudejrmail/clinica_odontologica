-- Script para verificar tabelas e dados existentes
-- Execute este script para entender o estado atual do banco

-- 1. LISTAR TODAS AS TABELAS DO BANCO
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. VERIFICAR QUANTIDADE DE REGISTROS POR TABELA
SELECT 
    schemaname,
    tablename,
    attrelid::regclass AS table_name,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 3. VERIFICAR ESTRUTURA DAS TABELAS PRINCIPAIS
-- Execute \d nome_da_tabela para ver detalhes

-- 4. VERIFICAR SE EXISTEM DADOS SENSÍVEIS (CPF, NOMES, etc)
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    column_name ILIKE '%cpf%' OR
    column_name ILIKE '%nome%' OR
    column_name ILIKE '%email%' OR
    column_name ILIKE '%telefone%' OR
    column_name ILIKE '%senha%' OR
    column_name ILIKE '%password%'
)
ORDER BY table_name, column_name;

-- 5. VERIFICAR SE JÁ EXISTE ALGUM SISTEMA DE USUÁRIOS
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    column_name ILIKE '%user%' OR
    column_name ILIKE '%role%' OR
    column_name ILIKE '%login%' OR
    column_name ILIKE '%auth%'
)
ORDER BY table_name, column_name;

-- 6. VERIFICAR SE EXISTEM FOREIGN KEYS
SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 7. VERIFICAR SE EXISTEM ÍNDICES
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 8. VERIFICAR SE EXISTEM TRIGGERS OU FUNCTIONS
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 9. VERIFICAR SE JÁ EXISTE ALGUMA CONFIGURAÇÃO DE RLS
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE rowsecurity = true
AND schemaname = 'public';

-- 10. ANÁLISE DE DADOS SENSÍVEIS
-- Execute com cuidado - mostra amostra dos dados

-- CPFs (mostra apenas quantidade e formato)
SELECT 
    'CPFs encontrados' as tipo_dado,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXEMPLO: ' || LEFT(MAX(cpf), 3) || '***.***-**'
        ELSE 'Nenhum CPF encontrado'
    END as exemplo
FROM pacientes
WHERE cpf IS NOT NULL;

-- Nomes (mostra apenas quantidade)
SELECT 
    'Nomes encontrados' as tipo_dado,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXEMPLO: ' || SPLIT_PART(MAX(nome), ' ', 1) || ' ***'
        ELSE 'Nenhum nome encontrado'
    END as exemplo
FROM pacientes
WHERE nome IS NOT NULL;

-- 11. VERIFICAR SE EXISTEM DENTISTAS CADASTRADOS
SELECT
    'Dentistas' as tipo,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) > 0 THEN 'CRO exemplo: ' || LEFT(MAX(cro), 2) || '***'
        ELSE 'Nenhum dentista encontrado'
    END as exemplo
FROM dentistas;

-- 12. VERIFICAR SE EXISTEM CONSULTAS AGENDADAS
SELECT
    'Consultas' as tipo,
    COUNT(*) as quantidade,
    MIN(data_hora) as primeira_consulta,
    MAX(data_hora) as ultima_consulta
FROM consultas;

-- 13. RESUMO DO ESTADO ATUAL
SELECT 
    'RESUMO DO BANCO DE DADOS:' as informacao
UNION ALL
SELECT 
    '========================='
UNION ALL
SELECT 
    'Tabelas existentes: ' || (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public')
UNION ALL
SELECT 
    'Total de registros: ' || (SELECT SUM(n_live_tup)::text FROM pg_stat_user_tables)
UNION ALL
SELECT 
    'RLS habilitado: ' || CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE rowsecurity = true AND schemaname = 'public') THEN 'SIM' ELSE 'NÃO' END
UNION ALL
SELECT 
    'Backup recente: ' || CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'backup_antigo') THEN 'SIM' ELSE 'NÃO' END;