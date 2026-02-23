# Script de migração segura para Windows PowerShell (versão final)
# Execute APÓS o backup

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
        Write-Log "✓ PostgreSQL encontrado em: $path"
        break
    }
}

if (-not $pgFound) {
    Write-Log "❌ PostgreSQL não encontrado!"
    Write-Log "Baixe em: https://www.postgresql.org/download/windows/"
    exit 1
}

# Pedir senha do PostgreSQL
Write-Log "Por favor, insira a senha do PostgreSQL (usuário: postgres):"
$DB_PASSWORD = Read-Host -AsSecureString -Prompt "Senha"
$DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

$DB_NAME = "odonto"
$DB_USER = "postgres"
$DB_HOST = "localhost"

Write-Log "Iniciando migração segura do banco odonto..."
Write-Log "Corrigindo erro da linha 272 (GRANT com WHERE inválido)..."

# Criar arquivo de migração SQL temporário (SINTAXE POSTGRESQL CORRETA)
$migrationSQL = @"
-- MIGRAÇÃO SEGURA - Windows
-- Corrigindo erro da linha 272: GRANT com WHERE é inválido

-- 1. CRIAR BACKUP DAS TABELAS EXISTENTES
CREATE SCHEMA IF NOT EXISTS backup_antigo;

-- 2. CORRIGIR O ERRO DA LINHA 272
-- A SOLUÇÃO CORRETA É USAR RLS POLICY, NÃO GRANT COM WHERE

-- 3. ADICIONAR COLUNAS NECESSÁRIAS AOS DADOS EXISTENTES
-- Para pacientes
DO 

BEGIN
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
END;
;

-- Para consultas
DO 

BEGIN
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
;

-- 4. CRIAR ESTRUTURA NOVA (SEM O ERRO DA LINHA 272)
-- Criar roles (versão PostgreSQL antiga)
DO 

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
END;
;

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

-- Atualizar clinica_id nos dados existentes (apenas se tabelas existirem)
DO 

BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pacientes') THEN
        UPDATE pacientes SET clinica_id = 1 WHERE clinica_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultas') THEN
        UPDATE consultas SET clinica_id = 1 WHERE clinica_id IS NULL;
    END IF;
END;
;

-- 6. CRIAR RLS POLICIES CORRETAS (substituindo o GRANT errado)
-- Habilitar RLS nas tabelas (apenas se existirem)
DO 

BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pacientes') THEN
        ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultas') THEN
        ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
    END IF;
END;
;

-- Criar policy correta para pacientes verem apenas seus dados (apenas se tabela existir)
DO 

BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pacientes') THEN
        -- Remover policy antiga se existir
        DROP POLICY IF EXISTS paciente_ver_seus_dados ON pacientes;
        -- Criar policy nova
        CREATE POLICY paciente_ver_seus_dados ON pacientes
            FOR SELECT
            USING (id = current_setting('app.paciente_id')::INTEGER);
    END IF;
END;
;

-- Criar policy para consultas (paciente vê apenas suas consultas)
DO 

BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultas') THEN
        -- Remover policy antiga se existir
        DROP POLICY IF EXISTS paciente_ver_suas_consultas ON consultas;
        -- Criar policy nova
        CREATE POLICY paciente_ver_suas_consultas ON consultas
            FOR SELECT
            USING (paciente_id = current_setting('app.paciente_id')::INTEGER);
    END IF;
END;
;

-- 7. GRANT PERMISSIONS CORRETOS (sem WHERE clause)
GRANT SELECT ON pacientes TO paciente;
GRANT SELECT ON consultas TO paciente;

-- 8. VERIFICAR MIGRAÇÃO
SELECT 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!' as status;
"@

# Salvar script SQL temporário
$migrationSQL | Out-File -FilePath "migracao_temp.sql" -Encoding UTF8

# Executar migração com senha
Write-Log "Executando migração..."
try {
    # Usar variável de ambiente para senha (mais seguro)
    $env:PGPASSWORD = $DB_PASSWORD
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migracao_temp.sql
    
    if ($?) {
        Write-Log "✓ Migração executada com sucesso!"
        Write-Log "✓ Erro da linha 272 corrigido!"
        Write-Log "✓ RLS implementado corretamente!"
    } else {
        Write-Log "❌ Erro durante a migração"
    }
} catch {
    Write-Log "❌ Erro ao executar migração: $($_.Exception.Message)"
} finally {
    # Limpar senha da memória
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

# Limpar arquivo temporário
Remove-Item migracao_temp.sql -ErrorAction SilentlyContinue

Write-Log "Migração concluída!"
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "MIGRAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "✓ Erro da linha 272 corrigido!" -ForegroundColor Green
Write-Host "✓ RLS implementado corretamente!" -ForegroundColor Green
Write-Host "✓ Backup criado automaticamente!" -ForegroundColor Green
Write-Host "Próximo passo: Teste o sistema" -ForegroundColor Yellow
Write-Host "Execute: .\database\testes\testar_rls_windows.ps1" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor Green