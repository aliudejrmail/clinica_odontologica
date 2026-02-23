# Script de teste RLS para Windows PowerShell
# Teste o sistema de segurança após migração

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
    "C:\Program Files\PostgreSQL\13\bin"
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

Write-Log "Iniciando testes de segurança RLS..."

# Criar usuário de teste
Write-Log "Criando usuário de teste..."
psql -U postgres -d odonto -c "
-- Criar usuário de teste
CREATE USER teste_paciente WITH PASSWORD 'teste123';
GRANT paciente TO teste_paciente;
"

# Inserir paciente de teste
Write-Log "Inserindo paciente de teste..."
psql -U postgres -d odonto -c "
-- Inserir paciente de teste
INSERT INTO pacientes (nome, cpf, email, telefone, clinica_id) 
VALUES ('Paciente Teste', '12345678901', 'teste@email.com', '11999999999', 1)
RETURNING id, nome;
"

# Testar acesso com contexto de paciente
Write-Log "Testando acesso com contexto de paciente..."
Write-Log "Paciente ID = 1 (deve ver apenas seus dados)"

# Teste 1: Paciente tenta ver todos os pacientes (deve falhar)
Write-Log "Teste 1: Paciente tentando ver todos os pacientes..."
$result1 = psql -U teste_paciente -d odonto -c "SET app.paciente_id = '1'; SELECT * FROM pacientes;" 2>&1
Write-Log "Resultado: $result1"

# Teste 2: Paciente tenta ver suas próprias consultas (deve funcionar)
Write-Log "Teste 2: Paciente tentando ver suas consultas..."
$result2 = psql -U teste_paciente -d odonto -c "SET app.paciente_id = '1'; SELECT * FROM consultas;" 2>&1
Write-Log "Resultado: $result2"

# Teste 3: Sem contexto (deve falhar)
Write-Log "Teste 3: Tentando acessar sem contexto..."
$result3 = psql -U teste_paciente -d odonto -c "SELECT * FROM pacientes;" 2>&1
Write-Log "Resultado: $result3"

# Verificar políticas RLS ativas
Write-Log "Verificando políticas RLS ativas..."
psql -U postgres -d odonto -c "
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public';
"

# Limpar usuário de teste
Write-Log "Limpando usuário de teste..."
psql -U postgres -d odonto -c "
-- Remover paciente de teste
DELETE FROM pacientes WHERE cpf = '12345678901';
-- Remover usuário de teste
DROP USER IF EXISTS teste_paciente;
"

Write-Log "Testes concluídos!"
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "TESTES DE RLS CONCLUÍDOS!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "Se tudo funcionou corretamente:" -ForegroundColor White
Write-Host "✓ Paciente só vê seus próprios dados" -ForegroundColor Green
Write-Host "✓ RLS está funcionando" -ForegroundColor Green
Write-Host "✓ Sistema está seguro" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green