-- ANÁLISE DE IMPACTO NAS TABELAS EXISTENTES
-- Este script verifica conflitos e cria migração segura

-- ===== VERIFICAÇÃO DE CONFLITOS =====

-- 1. Verificar se tabelas já existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'clinicas', 'pacientes', 'dentistas', 'consultas', 'procedimentos', 'consulta_procedimentos', 'odontogramas', 'pagamentos');

-- 2. Verificar estrutura das tabelas existentes
\d users
\d pacientes
\d consultas
\d dentistas

-- 3. Verificar se roles já existem
SELECT rolname FROM pg_roles WHERE rolname IN ('clinica_admin', 'dentista', 'recepcionista', 'paciente');

-- ===== SCRIPT DE MIGRAÇÃO SEGURA =====

-- Criar backup das tabelas existentes antes de qualquer alteração
CREATE SCHEMA IF NOT EXISTS backup_antigo;

-- Função para fazer backup de tabela existente
CREATE OR REPLACE FUNCTION backup_tabela_se_existir(p_tabela TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = p_tabela) THEN
        EXECUTE format('CREATE TABLE backup_antigo.%I AS SELECT * FROM public.%I', p_tabela, p_tabela);
        RAISE NOTICE 'Backup criado: backup_antigo.%', p_tabela;
    ELSE
        RAISE NOTICE 'Tabela % não existe, nenhum backup necessário', p_tabela;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fazer backup das tabelas que podem existir
SELECT backup_tabela_se_existir('users');
SELECT backup_tabela_se_existir('pacientes');
SELECT backup_tabela_se_existir('consultas');
SELECT backup_tabela_se_existir('dentistas');
SELECT backup_tabela_se_existir('procedimentos');
SELECT backup_tabela_se_existir('odontogramas');

-- ===== MIGRAÇÃO ADAPTATIVA =====

-- 1. Criar roles apenas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clinica_admin') THEN
        CREATE ROLE clinica_admin;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dentista') THEN
        CREATE ROLE dentista;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'recepcionista') THEN
        CREATE ROLE recepcionista;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'paciente') THEN
        CREATE ROLE paciente;
    END IF;
END
$$;

-- 2. Criar tabelas apenas se não existirem (com estrutura adaptada)

-- Tabela clinicas (se não existir)
CREATE TABLE IF NOT EXISTS clinicas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela users (adaptada para não conflitar)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('clinica_admin', 'dentista', 'recepcionista', 'paciente')),
    clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    dentista_id INTEGER, -- NULL para não-dentistas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Adaptar tabelas existentes para nova estrutura

-- Se a tabela pacientes já existe, adicionar colunas necessárias
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = 'pacientes') THEN
        
        -- Adicionar coluna clinica_id se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'pacientes' AND column_name = 'clinica_id') THEN
            ALTER TABLE pacientes ADD COLUMN clinica_id INTEGER;
            -- Aqui você precisa definir como atribuir clinicas aos pacientes existentes
            RAISE NOTICE 'Adicionada coluna clinica_id à tabela pacientes. É necessário atribuir clinicas aos registros existentes.';
        END IF;
        
        -- Verificar e adaptar outras colunas necessárias
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'pacientes' AND column_name = 'ativo') THEN
            ALTER TABLE pacientes ADD COLUMN ativo BOOLEAN DEFAULT true;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'pacientes' AND column_name = 'created_at') THEN
            ALTER TABLE pacientes ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'pacientes' AND column_name = 'updated_at') THEN
            ALTER TABLE pacientes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        
    END IF;
END
$$;

-- Se a tabela consultas já existe, adaptar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = 'consultas') THEN
        
        -- Adicionar coluna clinica_id se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'consultas' AND column_name = 'clinica_id') THEN
            ALTER TABLE consultas ADD COLUMN clinica_id INTEGER;
            RAISE NOTICE 'Adicionada coluna clinica_id à tabela consultas. É necessário atribuir clinicas aos registros existentes.';
        END IF;
        
        -- Adicionar coluna duracao_minutos se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'consultas' AND column_name = 'duracao_minutos') THEN
            ALTER TABLE consultas ADD COLUMN duracao_minutos INTEGER DEFAULT 60;
        END IF;
        
        -- Adicionar coluna status se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'consultas' AND column_name = 'status') THEN
            ALTER TABLE consultas ADD COLUMN status VARCHAR(50) DEFAULT 'agendada';
        END IF;
        
        -- Adicionar coluna tipo_consulta se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'consultas' AND column_name = 'tipo_consulta') THEN
            ALTER TABLE consultas ADD COLUMN tipo_consulta VARCHAR(100);
        END IF;
        
        -- Adicionar coluna valor_total se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'consultas' AND column_name = 'valor_total') THEN
            ALTER TABLE consultas ADD COLUMN valor_total DECIMAL(10,2);
        END IF;
        
    END IF;
END
$$;

-- ===== ATENÇÃO: COMANDOS QUE PRECISAM DE ATENÇÃO MANUAL =====

/*

⚠️  AVISOS IMPORTANTES:

1. **BACKUP OBRIGATÓRIO**: Execute um backup completo antes de prosseguir
   pg_dump -h localhost -U postgres -d odonto -f backup_completo_$(date +%Y%m%d).sql

2. **CLINICA_ID**: As tabelas pacientes, consultas, etc. precisam de clinica_id
   - Você precisa definir como atribuir clinicas aos registros existentes
   - Sugestão: Criar uma clínica padrão e atribuir a todos os registros existentes

3. **FOREIGN KEYS**: As referências precisam ser consistentes
   - Verifique se os IDs existem nas tabelas referenciadas
   - Pode ser necessário limpar dados inconsistentes

4. **RLS**: Row Level Security só funciona se todas as tabelas tiverem clinica_id
   - Não habilite RLS até que todos os dados estejam consistentes

5. **PERMISSÕES**: Os GRANTS no final do script original precisam ser adaptados
   - A linha que você apontou tem erro de sintaxe
   - Precisa usar políticas RLS ao invés de GRANT com WHERE

*/

-- ===== SOLUÇÃO PARA A LINHA COM ERRO =====

-- LINHA COM ERRO (linha 272):
-- GRANT SELECT ON consultas WHERE paciente_id = current_setting('app.paciente_id')::INTEGER TO paciente;

-- SOLUÇÃO CORRETA: Usar RLS policy ao invés de GRANT com WHERE
-- Isso será feito após garantir que todas as tabelas estão consistentes

-- ===== PASSO A PASSO SEGURO =====

/*

1. **FAZER BACKUP PRIMEIRO**
   sudo -u postgres pg_dump odonto > backup_$(date +%Y%m%d_%H%M%S).sql

2. **VERIFICAR DADOS EXISTENTES**
   - Liste todas as tabelas: \dt
   - Veja estrutura: \d nome_da_tabela
   - Conte registros: SELECT COUNT(*) FROM tabela;

3. **EXECUTAR MIGRAÇÃO ADAPTATIVA**
   - Rode este script de migração segura
   - Resolva conflitos manualmente se necessário

4. **ATRIBUIR CLINICAS AOS REGISTROS EXISTENTES**
   -- Exemplo: UPDATE pacientes SET clinica_id = 1 WHERE clinica_id IS NULL;
   -- Exemplo: UPDATE consultas SET clinica_id = 1 WHERE clinica_id IS NULL;

5. **HABILITAR RLS APENAS DEPOIS DE CONSISTENTE**
   - Execute as políticas RLS do script original
   - Teste com um usuário de teste primeiro

6. **TESTAR SEGURANÇA**
   -- Crie um usuário teste
   -- Verifique se ele só vê dados da clínica correta
   -- Teste diferentes roles (dentista, recepcionista, etc)

*/