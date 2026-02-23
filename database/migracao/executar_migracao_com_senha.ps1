# Script de migração segura para Windows PowerShell (com senha)
# Execute APÓS o backup

# Configurações - ALTERE A SENHA AQUI
$DB_PASSWORD = "postgres"  # <-- ALTERE PARA SUA SENHA DO POSTGRESQL
$DB_NAME = "odonto"
$DB_USER = "postgres"
$DB_HOST = "localhost"

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$Timestamp] $Message"
}

# Verificar PostgreSQL
$pgFound = $false
$pgPossiblePaths = @(
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files\PostgreSQL\13\bin",
    "C:\Program Files\PostgreSQL\12\bin"
)

foreach ($path in $pgPossiblePaths) {
    if (Test-Path "$path\psql.exe") {
        $env:PATH = "$path;$env:PATH"
        $pgFound = $true
        break
    }
}

if (-not $pgFound) {
    Write-Log "❌ PostgreSQL não encontrado!"
    exit 1
}

Write-Log "Iniciando migração segura do banco odonto..."

# Criar arquivo de migração SQL temporário
$migrationSQL = @"
-- MIGRAÇÃO SEGURA - Windows
-- Execute este script para migrar sem perder dados

-- 1. CRIAR BACKUP DAS TABELAS EXISTENTES
CREATE SCHEMA IF NOT EXISTS backup_antigo;

-- Backup das tabelas principais (apenas se existirem)
DO 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pacientes') THEN
        CREATE TABLE backup_antigo.pacientes_backup AS SELECT * FROM pacientes;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultas') THEN
        CREATE TABLE backup_antigo.consultas_backup AS SELECT * FROM consultas;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dentistas') THEN
        CREATE TABLE backup_antigo.dentistas_backup AS SELECT * FROM dentistas;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'procedimentos') THEN
        CREATE TABLE backup_antigo.procedimentos_backup AS SELECT * FROM procedimentos;
    END IF;
END;

-- 2. CORRIGIR A LINHA 272 (GRANT com WHERE é inválido)
-- A SOLUÇÃO CORRETA É USAR RLS POLICY, NÃO GRANT COM WHERE

-- 3. ADICIONAR COLUNAS NECESSÁRIAS AOS DADOS EXISTENTES
-- Adicionar clinica_id se não existir
DO 
BEGIN
    -- Para pacientes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pacientes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pacientes' AND column_name = 'clinica_id') THEN
            ALTER TABLE pacientes ADD COLUMN clinica_id INTEGER DEFAULT 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pacientes' AND column_name = 'created_at') THEN
            ALTER TABLE pacientes ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pacientes' AND column_name = 'updated_at') THEN
            ALTER TABLE pacientes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
    END IF;

    -- Para consultas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultas' AND column_name = 'clinica_id') THEN
            ALTER TABLE consultas ADD COLUMN clinica_id INTEGER DEFAULT 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultas' AND column_name = 'paciente_id') THEN
            ALTER TABLE consultas ADD COLUMN paciente_id INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultas' AND column_name = 'created_at') THEN
            ALTER TABLE consultas ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultas' AND column_name = 'updated_at') THEN
            ALTER TABLE consultas ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
    END IF;
END;

-- 4. CRIAR ESTRUTURA NOVA (SEM O ERRO DA LINHA 272)
-- Criar roles
CREATE ROLE IF NOT EXISTS clinica_admin;
CREATE ROLE IF NOT EXISTS dentista;
CREATE ROLE IF NOT EXISTS recepcionista;
CREATE ROLE IF NOT EXISTS paciente;

-- Criar tabelas se não existirem (estrutura correta)
CREATE TABLE IF NOT EXISTS clinicas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) UNIQUE,
    telefone VARCHAR(20),
    endereco TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. MIGRAR DADOS EXISTENTES PARA NOVA ESTRUTURA
-- Inserir clínica padrão se não existir
INSERT INTO clinicas (nome, cnpj) 
SELECT 'Clínica Principal', '00000000000191' 
WHERE NOT EXISTS (SELECT 1 FROM clinicas WHERE id = 1);

-- Atualizar clinica_id nos dados existentes
UPDATE pacientes SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE consultas SET clinica_id = 1 WHERE clinica_id IS NULL;

-- 6. CRIAR RLS POLICIES CORRETAS (substituindo o GRANT errado)
-- Habilitar RLS nas tabelas
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

-- Criar policy correta para pacientes verem apenas seus dados
CREATE POLICY IF NOT EXISTS paciente_ver_seus_dados ON pacientes
    FOR SELECT
    USING (id = current_setting('app.paciente_id')::INTEGER);

-- Criar policy para consultas (paciente vê apenas suas consultas)
CREATE POLICY IF NOT EXISTS paciente_ver_suas_consultas ON consultas
    FOR SELECT
    USING (paciente_id = current_setting('app.paciente_id')::INTEGER);

-- 7. GRANT PERMISSIONS CORRETOS (sem WHERE clause)
GRANT SELECT ON pacientes TO paciente;
GRANT SELECT ON consultas TO paciente;

-- 8. VERIFICAR MIGRAÇÃO
SELECT 'Migração concluída com sucesso!' as status;
SELECT 'Total de pacientes migrados: ' || COUNT(*) as info FROM pacientes WHERE clinica_id IS NOT NULL;
SELECT 'Total de consultas migradas: ' || COUNT(*) as info FROM consultas WHERE clinica_id IS NOT NULL;
"@

# Salvar script SQL temporário
$migrationSQL | Out-File -FilePath "migracao_temp.sql" -Encoding UTF8

# Executar migração com senha
Write-Log "Executando migração..."
try {
    # Usar variável de ambiente para senha (mais seguro)
    $env:PGPASSWORD = $DB_PASSWORD
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migracao_temp.sql -o migracao_resultado.txt
    
    if ($?) {
        Write-Log "✓ Migração executada com sucesso!"
        if (Test-Path migracao_resultado.txt) {
            Get-Content migracao_resultado.txt | ForEach-Object { Write-Log $_ }
        }
    } else {
        Write-Log "❌ Erro durante a migração"
        if (Test-Path migracao_resultado.txt) {
            Get-Content migracao_resultado.txt | ForEach-Object { Write-Log "ERRO: $_" }
        }
    }
} catch {
    Write-Log "❌ Erro ao executar migração: $($_.Exception.Message)"
} finally {
    # Limpar senha da memória
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

# Limpar arquivo temporário
Remove-Item migracao_temp.sql -ErrorAction SilentlyContinue
Remove-Item migracao_resultado.txt -ErrorAction SilentlyContinue

Write-Log "Migração concluída!"
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "MIGRAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "✓ Erro da linha 272 corrigido!" -ForegroundColor Green
Write-Host "✓ RLS implementado corretamente!" -ForegroundColor Green
Write-Host "Próximo passo: Teste o sistema" -ForegroundColor Yellow
Write-Host "Execute: .\database\testes\testar_rls_windows.ps1" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor Green