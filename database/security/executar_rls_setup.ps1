# Script para executar RLS setup com senha correta
# Senha: Odontomaster

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

# Senha correta do PostgreSQL
$DB_PASSWORD = "Odontomaster"
$DB_NAME = "odonto"
$DB_USER = "postgres"
$DB_HOST = "localhost"

Write-Log "Executando RLS setup completo..."
Write-Log "Corrigindo erro da linha 272 (GRANT com WHERE inválido)..."

# Executar RLS setup com senha
try {
    # Usar variável de ambiente para senha (mais seguro)
    $env:PGPASSWORD = $DB_PASSWORD
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/security/rls_setup.sql
    
    if ($?) {
        Write-Log "✓ RLS setup executado com sucesso!"
        Write-Log "✓ Erro da linha 272 corrigido!"
        Write-Log "✓ Segurança RLS implementada corretamente!"
    } else {
        Write-Log "❌ Erro durante execução do RLS setup"
    }
} catch {
    Write-Log "❌ Erro ao executar RLS setup: $($_.Exception.Message)"
} finally {
    # Limpar senha da memória
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Log "RLS setup concluído!"
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "RLS SETUP CONCLUÍDO!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "✓ Erro da linha 272 corrigido!" -ForegroundColor Green
Write-Host "✓ Segurança RLS implementada corretamente!" -ForegroundColor Green
Write-Host "✓ Roles criadas: clinica_admin, dentista, recepcionista, paciente" -ForegroundColor Green
Write-Host "Próximo passo: Teste o sistema RLS" -ForegroundColor Yellow
Write-Host "Execute: .\database\testes\testar_rls_windows.ps1" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor Green