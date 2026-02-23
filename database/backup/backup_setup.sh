#!/bin/bash
# Configuração de Backup e WAL Archiving para PostgreSQL
# Este script configura backup automático para dados de saúde

# 1. Configurar postgresql.conf (adicionar estas linhas)
cat >> /etc/postgresql/15/main/postgresql.conf << 'EOF'

# WAL Archiving Configuration
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/backups/wal/%f && cp %p /var/lib/postgresql/backups/wal/%f'
archive_timeout = 300  # Força switch de WAL a cada 5 minutos
max_wal_senders = 3
wal_keep_segments = 64

# Backup Configuration
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB

# Performance para backups
checkpoint_timeout = 15min
max_wal_size = 2GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9
EOF

# 2. Criar diretórios de backup
sudo mkdir -p /var/lib/postgresql/backups/{base,wal,scripts}
sudo chown -R postgres:postgres /var/lib/postgresql/backups
sudo chmod 700 /var/lib/postgresql/backups

# 3. Script de backup diário
sudo tee /var/lib/postgresql/backups/scripts/backup_diario.sh << 'EOF'
#!/bin/bash

# Configurações
BACKUP_DIR="/var/lib/postgresql/backups"
DB_NAME="odonto"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório do dia
mkdir -p "$BACKUP_DIR/base/$DATE"

# Backup completo com compressão
pg_dump -h localhost -U postgres -d "$DB_NAME" \
    --format=custom \
    --verbose \
    --file="$BACKUP_DIR/base/$DATE/odonto_backup.dump" \
    --jobs=4 \
    --compress=9

# Backup de schema apenas (para recuperação rápida)
pg_dump -h localhost -U postgres -d "$DB_NAME" \
    --schema-only \
    --file="$BACKUP_DIR/base/$DATE/schema.sql"

# Backup de dados críticos em formato SQL (para auditoria)
pg_dump -h localhost -U postgres -d "$DB_NAME" \
    --data-only \
    --table=pacientes \
    --table=consultas \
    --table=pagamentos \
    --file="$BACKUP_DIR/base/$DATE/dados_criticos.sql"

# Gerar relatório de backup
cat > "$BACKUP_DIR/base/$DATE/backup_report.txt" << EOL
Backup realizado em: $(date)
Tamanho do arquivo: $(du -h "$BACKUP_DIR/base/$DATE/odonto_backup.dump" | cut -f1)
Checksum MD5: $(md5sum "$BACKUP_DIR/base/$DATE/odonto_backup.dump" | cut -d' ' -f1)
Checksum SHA256: $(sha256sum "$BACKUP_DIR/base/$DATE/odonto_backup.dump" | cut -d' ' -f1)
EOL

# Limpar backups antigos (mantém últimos 30 dias)
find "$BACKUP_DIR/base" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;
find "$BACKUP_DIR/wal" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup diário concluído: $DATE"
EOF

sudo chmod +x /var/lib/postgresql/backups/scripts/backup_diario.sh

# 4. Configurar cron para backups automáticos
(crontab -l 2>/dev/null; echo "# Backup diário do banco odonto") | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * * /var/lib/postgresql/backups/scripts/backup_diario.sh >> /var/log/postgresql/backup.log 2>&1") | crontab -

echo "Configuração de backup concluída!"
echo "Próximos passos:"
echo "1. Reiniciar PostgreSQL: sudo systemctl restart postgresql"
echo "2. Testar backup: sudo -u postgres /var/lib/postgresql/backups/scripts/backup_diario.sh"