#!/bin/bash
# Script de Backup Completo - ANTES DA MIGRAÇÃO
# Execute este script antes de aplicar qualquer alteração no banco

# Configurações
DB_NAME="odonto"
DB_USER="postgres"
DB_HOST="localhost"
BACKUP_DIR="/var/lib/postgresql/backups/migracao_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$BACKUP_DIR/backup.log"

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/estrutura"
mkdir -p "$BACKUP_DIR/dados"
mkdir -p "$BACKUP_DIR/roles"

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "INICIANDO BACKUP COMPLETO DO BANCO $DB_NAME"

# 1. Backup das ROLES (usuários e permissões)
log "Fazendo backup das roles..."
pg_dumpall -h "$DB_HOST" -U "$DB_USER" --roles-only > "$BACKUP_DIR/roles/roles_backup.sql" 2>> "$LOG_FILE"
if [ $? -eq 0 ]; then
    log "✓ Backup das roles concluído"
else
    log "✗ ERRO no backup das roles"
    exit 1
fi

# 2. Backup da ESTRUTURA (schema)
log "Fazendo backup da estrutura..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    --schema-only \
    --verbose \
    --file="$BACKUP_DIR/estrutura/schema_backup.sql" 2>> "$LOG_FILE"
if [ $? -eq 0 ]; then
    log "✓ Backup da estrutura concluído"
else
    log "✗ ERRO no backup da estrutura"
    exit 1
fi

# 3. Backup dos DADOS (apenas dados)
log "Fazendo backup dos dados..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    --data-only \
    --verbose \
    --file="$BACKUP_DIR/dados/dados_backup.sql" 2>> "$LOG_FILE"
if [ $? -eq 0 ]; then
    log "✓ Backup dos dados concluído"
else
    log "✗ ERRO no backup dos dados"
    exit 1
fi

# 4. Backup COMPLETO (estrutura + dados)
log "Fazendo backup completo..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom \
    --verbose \
    --jobs=4 \
    --compress=9 \
    --file="$BACKUP_DIR/odonto_completo.dump" 2>> "$LOG_FILE"
if [ $? -eq 0 ]; then
    log "✓ Backup completo concluído"
else
    log "✗ ERRO no backup completo"
    exit 1
fi

# 5. Gerar relatório de tamanhos
log "Gerando relatório de tamanhos..."
cat > "$BACKUP_DIR/tamanhos.txt" << EOF
Relatório de Tamanhos do Backup
================================
Data: $(date)
Banco: $DB_NAME

Tamanho do backup completo: $(du -h "$BACKUP_DIR/odonto_completo.dump" | cut -f1)
Tamanho do schema: $(du -h "$BACKUP_DIR/estrutura/schema_backup.sql" | cut -f1)
Tamanho dos dados: $(du -h "$BACKUP_DIR/dados/dados_backup.sql" | cut -f1)
Tamanho das roles: $(du -h "$BACKUP_DIR/roles/roles_backup.sql" | cut -f1)

Espaço total utilizado: $(du -h "$BACKUP_DIR" | tail -1 | cut -f1)
EOF

# 6. Gerar checksums para verificação de integridade
log "Gerando checksums..."
cd "$BACKUP_DIR"
md5sum odonto_completo.dump > checksums.md5
sha256sum odonto_completo.dump > checksums.sha256
log "✓ Checksums gerados"

# 7. Testar restauração do backup
log "Testando integridade do backup..."
createdb -h "$DB_HOST" -U "$DB_USER" "${DB_NAME}_teste_backup" 2>/dev/null
if [ $? -eq 0 ]; then
    pg_restore -h "$DB_HOST" -U "$DB_USER" -d "${DB_NAME}_teste_backup" \
        --jobs=2 \
        --verbose \
        "odonto_completo.dump" > teste_restore.log 2>&1
    
    if [ $? -eq 0 ]; then
        log "✓ Teste de restauração bem-sucedido"
        dropdb -h "$DB_HOST" -U "$DB_USER" "${DB_NAME}_teste_backup"
    else
        log "✗ FALHA no teste de restauração"
        log "Verifique o arquivo: $BACKUP_DIR/teste_restore.log"
    fi
else
    log "✗ Não foi possível criar banco de teste"
fi

# 8. Listar tabelas e quantidades para referência
log "Listando tabelas e quantidades..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname,
    tablename,
    n_live_tup as quantidade_registros
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;
" > "$BACKUP_DIR/tabelas_quantidades.txt" 2>> "$LOG_FILE"

# 9. Informações finais
cat > "$BACKUP_DIR/info_backup.txt" << EOF
INFORMAÇÕES DO BACKUP
====================

Data do backup: $(date)
Banco de dados: $DB_NAME
Usuário: $DB_USER
Host: $DB_HOST

LOCALIZAÇÃO DOS ARQUIVOS:
- Backup completo: $BACKUP_DIR/odonto_completo.dump
- Estrutura: $BACKUP_DIR/estrutura/schema_backup.sql
- Dados: $BACKUP_DIR/dados/dados_backup.sql
- Roles: $BACKUP_DIR/roles/roles_backup.sql
- Log: $LOG_FILE
- Checksums: $BACKUP_DIR/checksums.md5 e checksums.sha256

COMO RESTAURAR (se necessário):
1. Criar banco: createdb -U postgres odonto_restore
2. Restaurar: pg_restore -U postgres -d odonto_restore $BACKUP_DIR/odonto_completo.dump
3. Verificar: psql -U postgres -d odonto_restore -c "SELECT COUNT(*) FROM pacientes;"

⚠️  IMPORTANTE: Guarde este backup em local seguro!
EOF

# 10. Comprimir backup completo
log "Compactando backup..."
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
if [ $? -eq 0 ]; then
    log "✓ Backup compactado: $BACKUP_DIR.tar.gz"
    log "Tamanho final: $(du -h "$BACKUP_DIR.tar.gz" | cut -f1)"
else
    log "✗ Erro ao compactar backup"
fi

log "BACKUP CONCLUÍDO COM SUCESSO!"
log "Localização: $BACKUP_DIR.tar.gz"
log "Próximo passo: Execute o script de verificação antes da migração"

# Mostrar resumo final
echo ""
echo "==============================================="
echo "BACKUP CONCLUÍDO COM SUCESSO!"
echo "==============================================="
echo "Data: $(date)"
echo "Local: $BACKUP_DIR.tar.gz"
echo "Tamanho: $(du -h "$BACKUP_DIR.tar.gz" | cut -f1)"
echo ""
echo "⚠️  AGORA VOCÊ PODE EXECUTAR A MIGRAÇÃO SEGURA"
echo "   Em caso de problemas, use este backup para restaurar"
echo "==============================================="