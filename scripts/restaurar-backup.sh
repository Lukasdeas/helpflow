#!/bin/bash

# Script de Restauração de Backup - Sistema Helpdesk IT
# ATENÇÃO: Este script irá SUBSTITUIR todos os dados do banco!

set -e

# Verificar parâmetros
if [ $# -eq 0 ]; then
    echo "❌ Uso: $0 <arquivo_backup.sql.gz>"
    echo ""
    echo "📁 Backups disponíveis:"
    ls -la /home/helpdesk/app/backups/helpdesk_*.sql.gz 2>/dev/null || echo "Nenhum backup encontrado"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Erro: Arquivo $BACKUP_FILE não encontrado"
    exit 1
fi

# Carregar variáveis do .env
if [ -f "/home/helpdesk/app/.env" ]; then
    source /home/helpdesk/app/.env
fi

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não está definida"
    exit 1
fi

echo "⚠️  ATENÇÃO: RESTAURAÇÃO DE BACKUP"
echo "=================================="
echo ""
echo "🗃️ Arquivo: $BACKUP_FILE"
echo "🎯 Banco: $(echo $DATABASE_URL | sed 's/.*@//' | sed 's/\/.*//')"
echo ""
echo "⚠️  ISTO IRÁ SUBSTITUIR TODOS OS DADOS ATUAIS!"
echo ""
read -p "Tem certeza que deseja continuar? (digite 'CONFIRMO'): " confirmacao

if [ "$confirmacao" != "CONFIRMO" ]; then
    echo "❌ Operação cancelada"
    exit 1
fi

echo ""
echo "🛑 Parando aplicação..."
pm2 stop helpdesk || echo "Aplicação não estava rodando"

echo "💾 Fazendo backup de segurança antes da restauração..."
SAFETY_BACKUP_DIR="/home/helpdesk/app/backups/safety"
mkdir -p $SAFETY_BACKUP_DIR
SAFETY_DATE=$(date +%Y%m%d_%H%M%S)
pg_dump "$DATABASE_URL" > "$SAFETY_BACKUP_DIR/before_restore_$SAFETY_DATE.sql"
echo "✅ Backup de segurança salvo em: $SAFETY_BACKUP_DIR/before_restore_$SAFETY_DATE.sql"

echo ""
echo "🗃️ Iniciando restauração..."

# Descompactar se necessário
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "📦 Descompactando arquivo..."
    TEMP_FILE="/tmp/restore_temp_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Executar restauração
echo "⚡ Restaurando banco de dados..."
psql "$DATABASE_URL" < "$RESTORE_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Restauração concluída com sucesso!"
    
    # Limpar arquivo temporário
    if [ ! -z "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
        rm "$TEMP_FILE"
    fi
    
    echo ""
    echo "🚀 Reiniciando aplicação..."
    pm2 restart helpdesk
    
    echo ""
    echo "🎉 RESTAURAÇÃO CONCLUÍDA!"
    echo "========================"
    echo ""
    echo "📊 Verificar status: pm2 list"
    echo "📝 Ver logs: pm2 logs helpdesk"
    echo "🌐 Testar aplicação na porta 3000"
    
else
    echo "❌ Erro durante a restauração!"
    
    # Limpar arquivo temporário em caso de erro
    if [ ! -z "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
        rm "$TEMP_FILE"
    fi
    
    echo ""
    echo "🔄 Tentando restaurar backup de segurança..."
    psql "$DATABASE_URL" < "$SAFETY_BACKUP_DIR/before_restore_$SAFETY_DATE.sql"
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup de segurança restaurado"
        pm2 restart helpdesk
    else
        echo "❌ Falha crítica: Não foi possível restaurar backup de segurança!"
        echo "⚠️ Contate o administrador imediatamente"
    fi
    
    exit 1
fi