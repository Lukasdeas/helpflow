#!/bin/bash

# Script de Backup do Banco de Dados - Sistema Helpdesk IT
# Este script faz backup automático do banco PostgreSQL

# Configurações
BACKUP_DIR="/home/helpdesk/app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Carregar variáveis do .env se existir
if [ -f "/home/helpdesk/app/.env" ]; then
    source /home/helpdesk/app/.env
fi

# Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não está definida"
    echo "Configure a variável DATABASE_URL no arquivo .env"
    exit 1
fi

echo "💾 Iniciando backup do banco de dados..."
echo "Data/Hora: $(date)"

# Fazer backup completo
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/helpdesk_full_$DATE.sql"

if [ $? -eq 0 ]; then
    echo "✅ Backup completo criado: helpdesk_full_$DATE.sql"
    
    # Fazer backup apenas dos dados (sem schema)
    pg_dump --data-only "$DATABASE_URL" > "$BACKUP_DIR/helpdesk_data_$DATE.sql"
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup de dados criado: helpdesk_data_$DATE.sql"
    else
        echo "⚠️ Aviso: Falha ao criar backup de dados"
    fi
    
    # Compactar backups para economizar espaço
    gzip "$BACKUP_DIR/helpdesk_full_$DATE.sql"
    gzip "$BACKUP_DIR/helpdesk_data_$DATE.sql" 2>/dev/null
    
    echo "🗜️ Backups compactados"
    
    # Remover backups antigos
    find $BACKUP_DIR -name "helpdesk_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    echo "🧹 Backups antigos removidos (>$RETENTION_DAYS dias)"
    
    # Mostrar tamanho dos backups
    echo ""
    echo "📊 Backups atuais:"
    ls -lh $BACKUP_DIR/helpdesk_*_$DATE.sql.gz 2>/dev/null
    
    echo ""
    echo "📁 Total de backups:"
    ls -1 $BACKUP_DIR/helpdesk_*.sql.gz | wc -l
    
    echo ""
    echo "💾 Espaço usado pelos backups:"
    du -sh $BACKUP_DIR
    
else
    echo "❌ Erro: Falha ao criar backup"
    exit 1
fi

echo ""
echo "✅ Backup concluído com sucesso!"