# Script de Backup PostgreSQL para Windows PowerShell
# Execute ANTES da migração

# Configurações
$DB_NAME = "odonto"
$DB_USER = "postgres"
$DB_HOST = "localhost"
$BACKUP_DIR = "C:\PostgreSQL_Backups\migracao_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$LOG_FILE = "$BACKUP_DIR\backup.log"

# Função de log
function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] $Message"
    Write-Host $LogEntry
    if (Test-Path (Split-Path $LOG_FILE -Parent)) {
        Add-Content -Path $LOG_FILE -Value $LogEntry
    }
}

# Criar diretório de backup PRIMEIRO
New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
New-Item -ItemType Directory -Path "$BACKUP_DIR\estrutura" -Force | Out-Null
New-Item -ItemType Directory -Path "$BACKUP_DIR\dados" -Force | Out-Null
New-Item -ItemType Directory -Path "$BACKUP_DIR\roles" -Force | Out-Null

Write-Log "INICIANDO BACKUP COMPLETO DO BANCO $DB_NAME"
New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
New-Item -ItemType Directory -Path "$BACKUP_DIR\estrutura" -Force | Out-Null
New-Item -ItemType Directory -Path "$BACKUP_DIR\dados" -Force | Out-Null
New-Item -ItemType Directory -Path "$BACKUP_DIR\roles" -Force | Out-Null

# 1. Verificar se PostgreSQL está no PATH
$pgPath = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgPath) {
    # Tentar encontrar PostgreSQL em locais comuns
    $pgPossiblePaths = @(
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files\PostgreSQL\14\bin",
        "C:\Program Files\PostgreSQL\13\bin",
        "C:\Program Files\PostgreSQL\12\bin"
    )
    
    $found = $false
    foreach ($path in $pgPossiblePaths) {
        if (Test-Path "$path\pg_dump.exe") {
            $env:PATH = "$path;$env:PATH"
            Write-Log "PostgreSQL encontrado em: $path"
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        Write-Log "❌ PostgreSQL não encontrado! Instale ou adicione ao PATH"
        Write-Log "Baixe em: https://www.postgresql.org/download/windows/"
        exit 1
    }
}

# 2. Backup das ROLES (usuários e permissões)
Write-Log "Fazendo backup das roles..."
try {
    pg_dumpall -h $DB_HOST -U $DB_USER --roles-only --file="$BACKUP_DIR\roles\roles_backup.sql" 2>> $LOG_FILE
    Write-Log "✓ Backup das roles concluído"
} catch {
    Write-Log "✗ ERRO no backup das roles: $($_.Exception.Message)"
    exit 1
}

# 3. Backup da ESTRUTURA (schema)
Write-Log "Fazendo backup da estrutura..."
try {
    pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME --schema-only --verbose --file="$BACKUP_DIR\estrutura\schema_backup.sql" 2>> $LOG_FILE
    Write-Log "✓ Backup da estrutura concluído"
} catch {
    Write-Log "✗ ERRO no backup da estrutura: $($_.Exception.Message)"
    exit 1
}

# 4. Backup dos DADOS (apenas dados)
Write-Log "Fazendo backup dos dados..."
try {
    pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME --data-only --verbose --file="$BACKUP_DIR\dados\dados_backup.sql" 2>> $LOG_FILE
    Write-Log "✓ Backup dos dados concluído"
} catch {
    Write-Log "✗ ERRO no backup dos dados: $($_.Exception.Message)"
    exit 1
}

# 5. Backup COMPLETO (estrutura + dados)
Write-Log "Fazendo backup completo..."
try {
    pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME --format=custom --verbose --file="$BACKUP_DIR\odonto_completo.dump" 2>> $LOG_FILE
    Write-Log "✓ Backup completo concluído"
} catch {
    Write-Log "✗ ERRO no backup completo: $($_.Exception.Message)"
    exit 1
}

# 6. Gerar relatório de tamanhos
Write-Log "Gerando relatório de tamanhos..."
$BackupSize = if (Test-Path "$BACKUP_DIR\odonto_completo.dump") { 
    (Get-Item "$BACKUP_DIR\odonto_completo.dump").Length / 1MB 
} else { 0 }

$SchemaSize = if (Test-Path "$BACKUP_DIR\estrutura\schema_backup.sql") { 
    (Get-Item "$BACKUP_DIR\estrutura\schema_backup.sql").Length / 1KB 
} else { 0 }

$DadosSize = if (Test-Path "$BACKUP_DIR\dados\dados_backup.sql") { 
    (Get-Item "$BACKUP_DIR\dados\dados_backup.sql").Length / 1KB 
} else { 0 }

@"
Relatório de Tamanhos do Backup
================================
Data: $(Get-Date)
Banco: $DB_NAME

Tamanho do backup completo: $([math]::Round($BackupSize, 2)) MB
Tamanho do schema: $([math]::Round($SchemaSize, 2)) KB
Tamanho dos dados: $([math]::Round($DadosSize, 2)) KB

Espaço total utilizado: $([math]::Round(($BackupSize + $SchemaSize + $DadosSize) / 1024, 2)) MB
"@ | Out-File -FilePath "$BACKUP_DIR\tamanhos.txt" -Encoding UTF8

# 7. Listar tabelas e quantidades para referência
Write-Log "Listando tabelas e quantidades..."
try {
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
    SELECT 
        schemaname,
        tablename,
        n_live_tup as quantidade_registros
    FROM pg_stat_user_tables 
    ORDER BY n_live_tup DESC;
    " -o "$BACKUP_DIR\tabelas_quantidades.txt" 2>> $LOG_FILE
    Write-Log "✓ Lista de tabelas gerada"
} catch {
    Write-Log "⚠️  Não foi possível listar tabelas: $($_.Exception.Message)"
}

# 8. Informações finais
@"
INFORMAÇÕES DO BACKUP
====================

Data do backup: $(Get-Date)
Banco de dados: $DB_NAME
Usuário: $DB_USER
Host: $DB_HOST

LOCALIZAÇÃO DOS ARQUIVOS:
- Backup completo: $BACKUP_DIR\odonto_completo.dump
- Estrutura: $BACKUP_DIR\estrutura\schema_backup.sql
- Dados: $BACKUP_DIR\dados\dados_backup.sql
- Roles: $BACKUP_DIR\roles\roles_backup.sql
- Log: $LOG_FILE

COMO RESTAURAR (se necessário):
1. Criar banco: createdb -U postgres odonto_restore
2. Restaurar: pg_restore -U postgres -d odonto_restore $BACKUP_DIR\odonto_completo.dump
3. Verificar: psql -U postgres -d odonto_restore -c "SELECT COUNT(*) FROM pacientes;"

⚠️  IMPORTANTE: Guarde este backup em local seguro!
"@ | Out-File -FilePath "$BACKUP_DIR\info_backup.txt" -Encoding UTF8

# 9. Comprimir backup completo
Write-Log "Compactando backup..."
try {
    Compress-Archive -Path $BACKUP_DIR -DestinationPath "$BACKUP_DIR.zip" -CompressionLevel Optimal
    $ZipSize = (Get-Item "$BACKUP_DIR.zip").Length / 1MB
    Write-Log "✓ Backup compactado: $BACKUP_DIR.zip"
    Write-Log "Tamanho final: $([math]::Round($ZipSize, 2)) MB"
    
    # Remover pasta original após compactar
    Remove-Item -Path $BACKUP_DIR -Recurse -Force
} catch {
    Write-Log "⚠️  Erro ao compactar backup: $($_.Exception.Message)"
}

Write-Log "BACKUP CONCLUÍDO COM SUCESSO!"
Write-Log "Localização: $BACKUP_DIR.zip"

# Mostrar resumo final
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "BACKUP CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "Data: $(Get-Date)" -ForegroundColor White
Write-Host "Local: $BACKUP_DIR.zip" -ForegroundColor White
Write-Host "Tamanho: $([math]::Round($ZipSize, 2)) MB" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  AGORA VOCÊ PODE EXECUTAR A MIGRAÇÃO SEGURA" -ForegroundColor Yellow
Write-Host "   Em caso de problemas, use este backup para restaurar" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Green