# Script de verificação do PostgreSQL para Windows PowerShell
# Execute para verificar o estado atual do banco

# Função de log
function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$Timestamp] $Message"
}

# Verificar se PostgreSQL está instalado
Write-Log "Verificando PostgreSQL..."

$pgPossiblePaths = @(
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files\PostgreSQL\13\bin",
    "C:\Program Files\PostgreSQL\12\bin",
    "C:\Program Files\PostgreSQL\11\bin"
)

$pgFound = $false
$pgPath = ""

foreach ($path in $pgPossiblePaths) {
    if (Test-Path "$path\psql.exe") {
        $env:PATH = "$path;$env:PATH"
        $pgPath = $path
        $pgFound = $true
        Write-Log "✓ PostgreSQL encontrado em: $path"
        break
    }
}

if (-not $pgFound) {
    Write-Log "❌ PostgreSQL não encontrado!"
    Write-Log "Baixe em: https://www.postgresql.org/download/windows/"
    Write-Log "Ou instale via Chocolatey: choco install postgresql"
    exit 1
}

# Verificar se banco 'odonto' existe
Write-Log "Verificando banco de dados 'odonto'..."
try {
    $result = psql -U postgres -l | Select-String "odonto"
    if ($result) {
        Write-Log "✓ Banco 'odonto' encontrado"
    } else {
        Write-Log "❌ Banco 'odonto' não encontrado"
        Write-Log "Criando banco 'odonto'..."
        createdb -U postgres odonto
        if ($?) {
            Write-Log "✓ Banco 'odonto' criado com sucesso"
        } else {
            Write-Log "❌ Erro ao criar banco 'odonto'"
            exit 1
        }
    }
} catch {
    Write-Log "❌ Erro ao verificar banco: $($_.Exception.Message)"
    exit 1
}

# Executar verificação das tabelas
Write-Log "Executando verificação das tabelas..."

$queries = @(
    "-- LISTAR TODAS AS TABELAS",
    "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
    
    "-- VERIFICAR QUANTIDADE DE REGISTROS",
    "SELECT tablename, n_live_tup as registros FROM pg_stat_user_tables ORDER BY n_live_tup DESC;",
    
    "-- VERIFICAR DADOS SENSÍVEIS",
    "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND (column_name ILIKE '%cpf%' OR column_name ILIKE '%nome%' OR column_name ILIKE '%email%') ORDER BY table_name;",
    
    "-- VERIFICAR SE EXISTEM USUÁRIOS",
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND (column_name ILIKE '%user%' OR column_name ILIKE '%role%') ORDER BY table_name;",
    
    "-- VERIFICAR FOREIGN KEYS",
    "SELECT tc.table_name, kcu.column_name, ccu.table_name as tabela_referenciada FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';",
    
    "-- VERIFICAR ÍNDICES",
    "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;",
    
    "-- VERIFICAR RLS",
    "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"
)

$outputFile = "C:\projetos_web\odonto_clinica\database\verificacao\resultado_verificacao.txt"

# Executar cada query
foreach ($query in $queries) {
    if ($query.StartsWith("--")) {
        Write-Log $query.Replace("-- ", "")
        Add-Content -Path $outputFile -Value "`n$query`n"
    } else {
        try {
            psql -U postgres -d odonto -c "$query" -o temp_result.txt 2>> $outputFile
            if (Test-Path temp_result.txt) {
                $result = Get-Content temp_result.txt -Raw
                Add-Content -Path $outputFile -Value "$result`n"
                Remove-Item temp_result.txt -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Log "⚠️  Erro na query: $($_.Exception.Message)"
        }
    }
}

Write-Log "✓ Verificação concluída"
Write-Log "Resultado salvo em: $outputFile"

# Mostrar resumo
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "VERIFICAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Execute o backup: .\database\backup\backup_windows.ps1" -ForegroundColor White
Write-Host "2. Execute a migração: .\database\migracao\executar_migracao_windows.ps1" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor Green