#!/bin/bash

# Script de Atualização - Sistema Helpdesk IT
# Execute este script para atualizações

set -e  # Parar em caso de erro

echo "🔄 INICIANDO ATUALIZAÇÃO DO SISTEMA HELPDESK"
echo "============================================"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# 1. Backup do banco de dados
echo "💾 Fazendo backup do banco de dados..."
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)

if [ ! -z "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/helpdesk_$DATE.sql"
    echo "✅ Backup salvo em: $BACKUP_DIR/helpdesk_$DATE.sql"
else
    echo "⚠️  Aviso: DATABASE_URL não definida, pulando backup"
fi

# 2. Parar aplicação
echo "⏹️  Parando aplicação..."
pm2 stop helpdesk || echo "Aplicação não estava rodando"

# 3. Atualizar código (se usando Git)
if [ -d ".git" ]; then
    echo "📥 Atualizando código do Git..."
    git pull origin main
fi

# 4. Instalar/atualizar dependências
echo "📦 Atualizando dependências..."
npm install --production

# 5. Build da aplicação
echo "🔨 Fazendo build da aplicação..."
npm run build

# 6. Atualizar banco de dados se necessário
echo "🗃️ Atualizando schema do banco..."
npm run db:push

# 7. Reiniciar aplicação
echo "🚀 Reiniciando aplicação..."
pm2 restart helpdesk

# 8. Aguardar alguns segundos e verificar status
sleep 5
pm2 list | grep helpdesk

# 9. Limpeza de backups antigos (manter últimos 7 dias)
echo "🧹 Limpando backups antigos..."
find $BACKUP_DIR -name "helpdesk_*.sql" -mtime +7 -delete 2>/dev/null || true

echo ""
echo "🎉 ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!"
echo "====================================="
echo ""
echo "📊 Status: pm2 list"
echo "📝 Logs: pm2 logs helpdesk"
echo "🌐 Aplicação disponível na porta 3000"
echo ""