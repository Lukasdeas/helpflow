#!/bin/bash
# Script de verificação do sistema - Sistema Helpdesk IT
# Execute como usuário helpdesk: bash verificar-sistema.sh

echo "=== VERIFICAÇÃO DO SISTEMA HELPDESK ==="
echo ""

# Função para verificar com emoji
check_status() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
    fi
}

# 1. Verificar serviços do sistema
echo "🔧 1. Verificando serviços do sistema..."
systemctl is-active --quiet postgresql
check_status $? "PostgreSQL ativo"

systemctl is-active --quiet nginx
check_status $? "Nginx ativo"

# 2. Verificar aplicação PM2
echo ""
echo "📱 2. Verificando aplicação..."
pm2 describe helpdesk > /dev/null 2>&1
if [ $? -eq 0 ]; then
    STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="helpdesk") | .pm2_env.status' 2>/dev/null)
    if [ "$STATUS" = "online" ]; then
        echo "✅ Aplicação helpdesk rodando"
    else
        echo "❌ Aplicação helpdesk parada (status: $STATUS)"
    fi
else
    echo "❌ Aplicação helpdesk não encontrada no PM2"
fi

# 3. Verificar conexão com banco
echo ""
echo "🗄️  3. Testando conexão com banco de dados..."
if [ -f ".env" ]; then
    source .env
    if [ ! -z "$DATABASE_URL" ]; then
        DB_HOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')
        DB_PORT=$(echo $DATABASE_URL | sed 's/.*:\([0-9]*\)\/.*/\1/')
        DB_USER=$(echo $DATABASE_URL | sed 's/.*\/\/\([^:]*\):.*/\1/')
        DB_NAME=$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')
        
        export PGPASSWORD=$(echo $DATABASE_URL | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
        
        USER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
        if [ ! -z "$USER_COUNT" ] && [ "$USER_COUNT" -gt 0 ]; then
            echo "✅ Conexão com banco OK ($USER_COUNT usuários encontrados)"
        else
            echo "❌ Erro na conexão com banco ou sem usuários"
        fi
        
        TICKET_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM tickets;" 2>/dev/null | xargs)
        if [ ! -z "$TICKET_COUNT" ]; then
            echo "✅ Tabela tickets OK ($TICKET_COUNT tickets encontrados)"
        else
            echo "❌ Erro ao acessar tabela tickets"
        fi
    else
        echo "❌ DATABASE_URL não encontrada no .env"
    fi
else
    echo "❌ Arquivo .env não encontrado"
fi

# 4. Verificar aplicação web
echo ""
echo "🌐 4. Testando aplicação web..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
check_status $([ "$HTTP_CODE" = "200" ] && echo 0 || echo 1) "Página principal (HTTP $HTTP_CODE)"

API_RESPONSE=$(curl -s http://localhost:3000/api/stats 2>/dev/null)
if echo "$API_RESPONSE" | grep -q "total"; then
    echo "✅ API de estatísticas funcionando"
    echo "   $API_RESPONSE"
else
    echo "❌ API de estatísticas não responde"
fi

# 5. Verificar upload de arquivos
echo ""
echo "📁 5. Verificando sistema de uploads..."
if [ -d "uploads" ]; then
    if [ -w "uploads" ]; then
        echo "✅ Diretório uploads acessível e com permissão de escrita"
        echo "   $(du -sh uploads/ 2>/dev/null | cut -f1) utilizados"
    else
        echo "❌ Diretório uploads sem permissão de escrita"
    fi
else
    echo "❌ Diretório uploads não existe"
fi

# 6. Verificar logs
echo ""
echo "📄 6. Verificando logs..."
if [ -d "logs" ]; then
    echo "✅ Diretório de logs existe"
    if [ -f "logs/combined.log" ]; then
        echo "   Últimas 3 linhas do log:"
        tail -3 logs/combined.log | sed 's/^/   /'
    fi
else
    echo "❌ Diretório de logs não existe"
fi

# 7. Verificar recursos do sistema
echo ""
echo "💾 7. Recursos do sistema..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')
DISK_USAGE=$(df . | tail -1 | awk '{print $5}')
LOAD_AVG=$(uptime | sed 's/.*load average: //' | cut -d',' -f1 | xargs)

echo "   RAM utilizada: $MEMORY_USAGE"
echo "   Disco utilizado: $DISK_USAGE"
echo "   Load average: $LOAD_AVG"

# 8. Verificar portas
echo ""
echo "🌐 8. Verificando portas..."
if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "✅ Porta 3000 (aplicação) em uso"
else
    echo "❌ Porta 3000 não está em uso"
fi

if netstat -tlnp 2>/dev/null | grep -q ":80"; then
    echo "✅ Porta 80 (nginx) em uso"
else
    echo "⚠️  Porta 80 não está em uso"
fi

if netstat -tlnp 2>/dev/null | grep -q ":5432"; then
    echo "✅ Porta 5432 (PostgreSQL) em uso"
else
    echo "❌ Porta 5432 não está em uso"
fi

echo ""
echo "=== ✅ VERIFICAÇÃO CONCLUÍDA ==="
echo ""
echo "📊 Para mais informações:"
echo "   pm2 status          # Status da aplicação"
echo "   pm2 logs helpdesk   # Logs em tempo real"
echo "   pm2 monit           # Monitor de recursos"
echo ""
echo "🔧 Para restart:"
echo "   pm2 restart helpdesk"
echo ""