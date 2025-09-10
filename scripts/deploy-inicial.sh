#!/bin/bash

# Script de Deploy Inicial - Sistema Helpdesk IT
# Execute este script na primeira instalação

set -e  # Parar em caso de erro

echo "🚀 INICIANDO DEPLOY INICIAL DO SISTEMA HELPDESK"
echo "================================================"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Erro: Node.js não está instalado"
    exit 1
fi

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ Erro: PostgreSQL não está instalado"
    exit 1
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ Erro: PM2 não está instalado. Execute: npm install -g pm2"
    exit 1
fi

# Verificar arquivo .env
if [ ! -f ".env" ]; then
    echo "❌ Erro: Arquivo .env não encontrado"
    echo "Crie o arquivo .env com as variáveis necessárias (consulte o guia)"
    exit 1
fi

echo "✅ Verificações iniciais concluídas"

# 1. Instalar dependências
echo "📦 Instalando dependências..."
npm install --production

# 2. Build da aplicação
echo "🔨 Fazendo build da aplicação..."
npm run build

# 3. Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p logs uploads backups
chmod 755 uploads

# 4. Configurar banco de dados
echo "🗃️ Configurando banco de dados..."
npm run db:push --force

# 5. Criar usuários iniciais com senhas seguras
echo "👥 Criando usuários iniciais..."
if [ -f "sql/usuarios-iniciais-corrigido.sql" ]; then
    # Usar variáveis do .env para conectar
    source .env
    if [ ! -z "$DATABASE_URL" ]; then
        # Extrair componentes da URL de conexão
        DB_HOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')
        DB_PORT=$(echo $DATABASE_URL | sed 's/.*:\([0-9]*\)\/.*/\1/')
        DB_USER=$(echo $DATABASE_URL | sed 's/.*\/\/\([^:]*\):.*/\1/')
        DB_NAME=$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')
        
        export PGPASSWORD=$(echo $DATABASE_URL | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
        
        echo "   Executando script de usuários..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f sql/usuarios-iniciais-corrigido.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Usuários criados com sucesso"
        else
            echo "⚠️  Erro ao criar usuários, mas continuando..."
        fi
    else
        echo "⚠️  DATABASE_URL não encontrada no .env"
    fi
else
    echo "⚠️  Arquivo sql/usuarios-iniciais-corrigido.sql não encontrado"
    echo "   Os usuários podem ser criados manualmente via interface web"
fi

# 6. Testar conexão com banco
echo "🔍 Testando conexão com banco..."
node -e "
require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) as total FROM users')
  .then(result => {
    console.log('✅ Conexão com banco OK');
    console.log('   Usuários no sistema:', result.rows[0].total);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro na conexão com banco:', err.message);
    process.exit(1);
  });
"

# 7. Parar aplicação anterior se existir
echo "🔄 Parando aplicação anterior..."
pm2 stop helpdesk 2>/dev/null || true

# 8. Iniciar aplicação com PM2
echo "🚀 Iniciando aplicação..."
if pm2 list | grep -q "helpdesk"; then
    pm2 restart helpdesk
else
    pm2 start ecosystem.config.js
fi

# 9. Salvar configuração PM2
pm2 save

# 10. Configurar PM2 para iniciar no boot
pm2 startup

# 11. Verificação final
echo "🔍 Verificação final..."
sleep 3

# Verificar se aplicação está rodando
if pm2 list | grep -q "online.*helpdesk"; then
    echo "✅ Aplicação iniciada com sucesso"
else
    echo "❌ Problema ao iniciar aplicação"
    pm2 logs helpdesk --lines 10
fi

# Testar endpoint da aplicação
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    echo "✅ Aplicação respondendo na porta 3000"
else
    echo "⚠️  Aplicação pode estar iniciando, aguarde alguns segundos"
fi

echo ""
echo "🎉 DEPLOY INICIAL CONCLUÍDO COM SUCESSO!"
echo "========================================"
echo ""
echo "🌐 Sistema disponível em: http://localhost:3000"
echo ""
echo "🔑 Credenciais padrão (ALTERE IMEDIATAMENTE):"
echo "   Admin:    admin / admin123"
echo "   Técnico:  tecnico1 / tech123"
echo ""
echo "📋 Próximos passos OBRIGATÓRIOS:"
echo "1. 🔒 Altere as senhas padrão dos usuários"
echo "2. 🌐 Configure o Nginx (consulte o guia)"
echo "3. 🔐 Configure SSL com Certbot"
echo "4. 💾 Configure backups automáticos"
echo "5. 🛡️  Configure firewall"
echo ""
echo "📊 Comandos úteis:"
echo "   pm2 status           # Status da aplicação"
echo "   pm2 logs helpdesk    # Ver logs"
echo "   pm2 monit            # Monitor de recursos"
echo "   pm2 restart helpdesk # Reiniciar aplicação"
echo ""
echo "📖 Consulte o deploy-guide.md para configuração completa"
echo ""