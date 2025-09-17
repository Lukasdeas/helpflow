# 🚀 Guia Completo de Deploy - Sistema Helpdesk IT

Este guia fornece instruções detalhadas para fazer deploy do sistema de helpdesk em um servidor Linux para produção, incluindo configuração completa do sistema de notificações por email.

## 📋 Visão Geral do Sistema

- **Frontend:** React + TypeScript + Vite
- **Backend:** Express.js + TypeScript + REST API
- **Banco de Dados:** SQLite + Drizzle ORM (100% local)
- **Notificações:** Sistema de email automático via SMTP
- **Autenticação:** Sistema seguro com hash PBKDF2 + roles (técnico/admin)
- **UI:** Tailwind CSS + shadcn/ui
- **Upload de Arquivos:** Multer + armazenamento local
- **Vantagem:** Sistema 100% self-contained, funciona offline após configuração inicial

## ✅ Funcionalidades Implementadas

- ✅ Sistema de abertura de chamados
- ✅ Dashboard para técnicos e administradores
- ✅ Controle de permissões por role
- ✅ Upload e download de arquivos
- ✅ Sistema de comentários em tempo real
- ✅ **Notificações automáticas por email:**
  - ✉️ Email na criação do chamado
  - ✉️ Email quando técnico assume o chamado
  - ✉️ Email em comentários/atualizações
  - ✉️ Email em mudanças de prioridade
  - ✉️ Email na resolução do chamado
- ✅ Relatórios e estatísticas
- ✅ Backup automático

## 🖥️ Requisitos do Sistema

### Hardware Mínimo
- **RAM:** 2GB (recomendado 4GB+ para melhor performance)
- **CPU:** 1 core (recomendado 2+ cores)
- **Armazenamento:** 10GB livres (recomendado 20GB+)
- **Rede:** Acesso à internet para instalação e envio de emails

### Software Obrigatório
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js:** v18.0+ (recomendado v20+)
- **Nginx:** v1.18+ (proxy reverso)
- **PM2:** Gerenciador de processos Node.js
- **SQLite:** Incluído automaticamente

## 🌐 Preparação do Servidor

### 1. Atualizar Sistema
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Instalar Node.js 20 LTS
```bash
# Usando NodeSource Repository (recomendado)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version  # deve mostrar v20.x.x
npm --version   # deve mostrar v10.x.x
```

### 3. Instalar Ferramentas Essenciais
```bash
# Ubuntu/Debian
sudo apt install -y nginx git curl build-essential sqlite3

# CentOS/RHEL
sudo yum install -y nginx git curl gcc-c++ make sqlite
```

### 4. Instalar PM2 Globalmente
```bash
sudo npm install -g pm2

# Verificar instalação
pm2 --version
```

### 5. Configurar Firewall
```bash
# Habilitar firewall
sudo ufw enable

# Permitir conexões essenciais
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Verificar status
sudo ufw status
```

## 👤 Preparação da Aplicação

### 1. Criar Usuário para Aplicação
```bash
# Criar usuário dedicado
sudo adduser --system --group --home /home/helpdesk helpdesk

# Criar diretório da aplicação
sudo mkdir -p /home/helpdesk/app
sudo chown helpdesk:helpdesk /home/helpdesk/app
```

### 2. Transferir Código da Aplicação
```bash
# Método 1: Upload direto (recomendado para produção)
# Compacte seus arquivos localmente e use scp:
tar -czf helpdesk-app.tar.gz .
scp helpdesk-app.tar.gz usuario@servidor:/home/helpdesk/

# No servidor, descompacte:
sudo su - helpdesk
cd /home/helpdesk
tar -xzf helpdesk-app.tar.gz -C app/
cd app/

# Método 2: Git clone (se o código estiver em repositório)
sudo su - helpdesk
cd /home/helpdesk
git clone https://github.com/seu-usuario/helpdesk-repo.git app
cd app/
```

### 3. Instalar Dependências
```bash
# Como usuário helpdesk
cd /home/helpdesk/app

# Instalar dependências de produção
npm install --production --no-optional

# Verificar se todas as dependências foram instaladas
npm list --depth=0
```

## ⚙️ Configuração de Variáveis de Ambiente

### 1. Criar Arquivo .env
```bash
cd /home/helpdesk/app
nano .env
```

### 2. Configuração Completa do .env
```env
# ===========================================
# CONFIGURAÇÃO GERAL DA APLICAÇÃO
# ===========================================
NODE_ENV=production
PORT=3000

# Chave de sessão (OBRIGATÓRIA - gere uma chave única)
SESSION_SECRET="SUA_CHAVE_SUPER_SEGURA_DE_32_CARACTERES_AQUI"

# ===========================================
# CONFIGURAÇÃO DE UPLOAD DE ARQUIVOS
# ===========================================
UPLOAD_PATH="/home/helpdesk/app/uploads"
MAX_FILE_SIZE=50MB

# ===========================================
# CONFIGURAÇÃO DE EMAIL SMTP
# ===========================================
# Email remetente (será exibido como remetente dos emails)
EMAIL_FROM="suporte@suaempresa.com"

# Configurações SMTP do servidor de email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app"

# ===========================================
# CONFIGURAÇÕES ESPECÍFICAS POR PROVEDOR
# ===========================================

# GMAIL (usando senha de app):
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=seu-email@gmail.com
# SMTP_PASS=sua-senha-de-aplicativo

# OUTLOOK/HOTMAIL:
# SMTP_HOST=smtp-mail.outlook.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=seu-email@outlook.com
# SMTP_PASS=sua-senha

# SERVIDOR SMTP PERSONALIZADO:
# SMTP_HOST=mail.suaempresa.com
# SMTP_PORT=587 (ou 465 para SSL)
# SMTP_SECURE=false (true para porta 465)
# SMTP_USER=suporte@suaempresa.com
# SMTP_PASS=senha-do-email

# SENDGRID:
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=apikey
# SMTP_PASS=sua-api-key-do-sendgrid

# ===========================================
# CONFIGURAÇÕES OPCIONAIS
# ===========================================
# Logging level (error, warn, info, debug)
LOG_LEVEL=info

# Tempo limite para uploads (em segundos)
UPLOAD_TIMEOUT=300

# Modo de desenvolvimento/teste (deixe em false para produção)
DEBUG_MODE=false
```

### 3. Configurar Permissões do .env
```bash
# Proteger arquivo de configuração
chmod 600 /home/helpdesk/app/.env
chown helpdesk:helpdesk /home/helpdesk/app/.env
```

## 📧 Configuração Específica de Email

### Gmail (Recomendado para empresas pequenas)

1. **Habilitar autenticação de 2 fatores** na sua conta Gmail
2. **Gerar senha de aplicativo:**
   - Acesse: https://myaccount.google.com/security
   - Clique em "Senhas de app"
   - Selecione "Aplicativo personalizado"
   - Digite "Helpdesk Sistema" e gere a senha
   - Use esta senha no `SMTP_PASS`

```env
EMAIL_FROM="suporte@suaempresa.com"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=senha-de-aplicativo-gerada
```

### Outlook/Hotmail

```env
EMAIL_FROM="suporte@suaempresa.com"
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@outlook.com
SMTP_PASS=sua-senha-normal
```

### Servidor SMTP Próprio da Empresa

```env
EMAIL_FROM="suporte@suaempresa.com"
SMTP_HOST=mail.suaempresa.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=suporte@suaempresa.com
SMTP_PASS=senha-do-email-corporativo
```

### SendGrid (Para alto volume)

1. Criar conta no SendGrid
2. Gerar API Key
3. Configurar:

```env
EMAIL_FROM="suporte@suaempresa.com"
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.sua-api-key-do-sendgrid
```

## 🏗️ Build e Preparação da Aplicação

### 1. Criar Diretórios Necessários
```bash
cd /home/helpdesk/app

# Criar diretórios essenciais
mkdir -p uploads
mkdir -p logs
mkdir -p backups

# Definir permissões corretas
chmod 755 uploads
chmod 755 logs
chmod 755 backups
```

### 2. Gerar SESSION_SECRET Seguro
```bash
# Gerar chave aleatória de 32 caracteres
openssl rand -base64 32

# Editar .env e substituir SESSION_SECRET pela chave gerada
nano .env
```

### 3. Build da Aplicação
```bash
cd /home/helpdesk/app

# Instalar dependências de desenvolvimento para build
npm install

# Fazer build do frontend e backend
npm run build

# Verificar se build foi criado
ls -la dist/

# Remover dependências de desenvolvimento (economizar espaço)
npm prune --production
```

## 🔧 Configuração do PM2

### 1. Verificar Configuração PM2
```bash
cd /home/helpdesk/app
cat ecosystem.config.js
```

O arquivo deve estar assim:
```javascript
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: './dist/index.js',
    cwd: '/home/helpdesk/app',
    instances: 1, // Para SQLite use sempre 1
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Performance
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Health check
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Auto restart em caso de crash
    autorestart: true,
    watch: false
  }]
}
```

### 2. Iniciar Aplicação com PM2
```bash
cd /home/helpdesk/app

# Iniciar aplicação
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Salvar configuração para reinicialização automática
pm2 save

# Configurar inicialização automática na inicialização do sistema
pm2 startup systemd
# IMPORTANTE: Execute o comando que o PM2 mostrar na tela

# Verificar logs
pm2 logs helpdesk --lines 20
```

## 🗄️ Inicialização do Banco de Dados

### 1. Verificar Criação Automática do Banco
```bash
cd /home/helpdesk/app

# O banco SQLite será criado automaticamente
# Verificar se foi criado com sucesso
ls -la helpdesk.db

# Se não existir, verificar logs para diagnóstico
pm2 logs helpdesk
```

### 2. Criar Usuários Iniciais

**Importante:** Aguarde alguns segundos após iniciar a aplicação antes de criar usuários.

```bash
# Testar se aplicação está respondendo
curl -I http://localhost:3000/

# Criar usuário administrador
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!@#",
    "name": "Administrador do Sistema",
    "email": "admin@suaempresa.com",
    "role": "admin"
  }'

# Criar usuário técnico
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tecnico1",
    "password": "Tech123!@#",
    "name": "Técnico de TI",
    "email": "tecnico@suaempresa.com", 
    "role": "technician"
  }'

# Verificar se usuários foram criados
sqlite3 helpdesk.db "SELECT username, name, role FROM users;"
```

## 🌐 Configuração do Nginx

### 1. Criar Configuração do Site
```bash
sudo nano /etc/nginx/sites-available/helpdesk
```

### 2. Conteúdo da Configuração Nginx
```nginx
# Configuração do Nginx para Sistema Helpdesk
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Tamanho máximo de upload (importante para anexos)
    client_max_body_size 50M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # Logs específicos do sistema
    access_log /var/log/nginx/helpdesk.access.log;
    error_log /var/log/nginx/helpdesk.error.log;

    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy principal para aplicação Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts aumentados para uploads grandes
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }

    # Servir arquivos de upload diretamente pelo Nginx (melhor performance)
    location /uploads/ {
        alias /home/helpdesk/app/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
        
        # Segurança: evitar execução de scripts
        location ~* \.(php|jsp|asp|sh|cgi)$ {
            deny all;
        }
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }

    # Compressão Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Rate limiting básico
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Habilitar Site e Testar
```bash
# Habilitar site
sudo ln -s /etc/nginx/sites-available/helpdesk /etc/nginx/sites-enabled/

# Remover site padrão se necessário
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Se teste passou, reiniciar Nginx
sudo systemctl restart nginx

# Verificar status
sudo systemctl status nginx
```

## 🔒 Configuração SSL com Let's Encrypt

### 1. Instalar Certbot
```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx -y

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx -y
```

### 2. Obter Certificado SSL
```bash
# Substituir seu-dominio.com pelo seu domínio real
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Seguir as instruções na tela
# Escolher opção para redirecionar HTTP para HTTPS automaticamente
```

### 3. Testar Renovação Automática
```bash
# Testar renovação
sudo certbot renew --dry-run

# Verificar se cron job foi criado
sudo crontab -l | grep certbot
```

## 🧪 Testes Completos do Sistema

### 1. Teste de Funcionalidade Básica
```bash
# Testar se aplicação responde
curl -I http://localhost:3000/
# Deve retornar: HTTP/1.1 200 OK

# Testar endpoint de API
curl http://localhost:3000/api/stats
# Deve retornar JSON com estatísticas
```

### 2. Teste de Autenticação
```bash
# Testar login do administrador
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!@#"}'

# Deve retornar: {"id":"...","username":"admin","role":"admin"}
```

### 3. Teste de Sistema de Email
```bash
# Criar um ticket de teste para verificar envio de email
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Teste do sistema de email",
    "description": "Testando se emails são enviados corretamente",
    "sector": "TI",
    "problemType": "teste",
    "priority": "medium",
    "requesterName": "Teste User",
    "userEmail": "seuemail@test.com"
  }'

# Verificar nos logs se email foi enviado
pm2 logs helpdesk | grep -i email

# Verificar se email chegou na caixa de entrada do seuemail@test.com
```

### 4. Teste de Upload de Arquivos
```bash
# Criar arquivo de teste
echo "Teste de upload" > /tmp/teste.txt

# Testar upload
curl -X POST http://localhost:3000/api/upload/test \
  -F "file=@/tmp/teste.txt"

# Verificar se arquivo foi salvo
ls -la /home/helpdesk/app/uploads/
```

### 5. Teste de Performance
```bash
# Instalar Apache Bench para teste de carga
sudo apt install apache2-utils -y

# Teste básico de carga
ab -n 100 -c 10 http://localhost:3000/

# Monitorar recursos durante teste
htop
```

## 📊 Monitoramento e Logs

### 1. Monitoramento da Aplicação
```bash
# Status detalhado da aplicação
pm2 status

# Logs em tempo real
pm2 logs helpdesk

# Monitoramento de recursos
pm2 monit

# Estatísticas de reinicializações
pm2 show helpdesk
```

### 2. Monitoramento do Sistema
```bash
# Uso de CPU e memória
htop

# Uso do disco
df -h
du -sh /home/helpdesk/app/

# Conexões de rede
netstat -tlnp | grep :3000

# Verificar portas abertas
sudo ufw status
```

### 3. Logs do Nginx
```bash
# Logs de acesso em tempo real
sudo tail -f /var/log/nginx/helpdesk.access.log

# Logs de erro
sudo tail -f /var/log/nginx/helpdesk.error.log

# Analisar logs de erro mais recentes
sudo tail -50 /var/log/nginx/helpdesk.error.log
```

### 4. Monitoramento do Email
```bash
# Verificar configuração SMTP nos logs
pm2 logs helpdesk | grep -i smtp

# Verificar emails enviados
pm2 logs helpdesk | grep -i "email enviado"

# Verificar erros de email
pm2 logs helpdesk | grep -i "erro.*email"
```

## 💾 Sistema de Backup Automático

### 1. Script de Backup Completo
```bash
# Criar script de backup
sudo nano /home/helpdesk/backup-helpdesk.sh
```

Conteúdo do script:
```bash
#!/bin/bash
# Script de backup completo do sistema Helpdesk
# Criado para backup automático diário

# Configurações
BACKUP_DIR="/home/helpdesk/backups"
APP_DIR="/home/helpdesk/app"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

echo "=== BACKUP HELPDESK INICIADO ==="
echo "Data/Hora: $(date)"
echo "Backup ID: $DATE"

# 1. Parar aplicação para backup consistente
echo "Parando aplicação..."
pm2 stop helpdesk

# 2. Backup do banco SQLite
echo "Fazendo backup do banco de dados..."
if [ -f "$APP_DIR/helpdesk.db" ]; then
    cp "$APP_DIR/helpdesk.db" "$BACKUP_DIR/helpdesk_${DATE}.db"
    echo "✅ Banco de dados: helpdesk_${DATE}.db"
else
    echo "❌ Erro: Banco de dados não encontrado!"
fi

# 3. Backup dos arquivos de upload
echo "Fazendo backup dos uploads..."
if [ -d "$APP_DIR/uploads" ] && [ "$(ls -A $APP_DIR/uploads)" ]; then
    tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" -C "$APP_DIR" uploads/
    echo "✅ Uploads: uploads_${DATE}.tar.gz"
else
    echo "⚠️ Diretório de uploads vazio ou não encontrado"
fi

# 4. Backup da configuração
echo "Fazendo backup da configuração..."
if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$BACKUP_DIR/env_${DATE}.backup"
    echo "✅ Configuração: env_${DATE}.backup"
fi

# 5. Backup dos logs
echo "Fazendo backup dos logs..."
if [ -d "$APP_DIR/logs" ] && [ "$(ls -A $APP_DIR/logs)" ]; then
    tar -czf "$BACKUP_DIR/logs_${DATE}.tar.gz" -C "$APP_DIR" logs/
    echo "✅ Logs: logs_${DATE}.tar.gz"
fi

# 6. Reiniciar aplicação
echo "Reiniciando aplicação..."
pm2 start helpdesk

# 7. Limpeza de backups antigos
echo "Limpando backups antigos (>$RETENTION_DAYS dias)..."
find $BACKUP_DIR -name "helpdesk_*.db" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "env_*.backup" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "logs_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 8. Relatório final
echo ""
echo "=== BACKUP CONCLUÍDO ==="
echo "Arquivos criados:"
ls -lh $BACKUP_DIR/*${DATE}*
echo ""
echo "Espaço usado pelos backups:"
du -sh $BACKUP_DIR
echo ""
echo "Backups disponíveis:"
ls -la $BACKUP_DIR | grep $(date +%Y%m)
```

### 2. Configurar Execução Automática
```bash
# Tornar script executável
chmod +x /home/helpdesk/backup-helpdesk.sh

# Testar script
sudo /home/helpdesk/backup-helpdesk.sh

# Configurar cron para backup diário às 2:30 AM
sudo crontab -e

# Adicionar linha:
30 2 * * * /home/helpdesk/backup-helpdesk.sh >> /var/log/helpdesk-backup.log 2>&1

# Verificar se cron foi configurado
sudo crontab -l
```

### 3. Script de Restauração
```bash
# Criar script de restauração
sudo nano /home/helpdesk/restore-helpdesk.sh
```

Conteúdo:
```bash
#!/bin/bash
# Script de restauração do sistema Helpdesk

if [ "$#" -ne 1 ]; then
    echo "Uso: $0 YYYYMMDD_HHMMSS"
    echo "Exemplo: $0 20241010_023000"
    exit 1
fi

BACKUP_ID=$1
BACKUP_DIR="/home/helpdesk/backups"
APP_DIR="/home/helpdesk/app"

echo "=== RESTAURAÇÃO HELPDESK ==="
echo "Backup ID: $BACKUP_ID"

# Verificar se backups existem
if [ ! -f "$BACKUP_DIR/helpdesk_${BACKUP_ID}.db" ]; then
    echo "❌ Erro: Backup do banco não encontrado!"
    exit 1
fi

# Parar aplicação
echo "Parando aplicação..."
pm2 stop helpdesk

# Backup atual antes de restaurar
echo "Fazendo backup de segurança do estado atual..."
cp "$APP_DIR/helpdesk.db" "$APP_DIR/helpdesk.db.pre-restore"

# Restaurar banco
echo "Restaurando banco de dados..."
cp "$BACKUP_DIR/helpdesk_${BACKUP_ID}.db" "$APP_DIR/helpdesk.db"

# Restaurar uploads se existir
if [ -f "$BACKUP_DIR/uploads_${BACKUP_ID}.tar.gz" ]; then
    echo "Restaurando uploads..."
    rm -rf "$APP_DIR/uploads"
    tar -xzf "$BACKUP_DIR/uploads_${BACKUP_ID}.tar.gz" -C "$APP_DIR/"
fi

# Restaurar configuração se solicitado
read -p "Restaurar configuração .env? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$BACKUP_DIR/env_${BACKUP_ID}.backup" ]; then
        cp "$BACKUP_DIR/env_${BACKUP_ID}.backup" "$APP_DIR/.env"
        echo "✅ Configuração restaurada"
    fi
fi

# Ajustar permissões
chown -R helpdesk:helpdesk "$APP_DIR"
chmod 600 "$APP_DIR/helpdesk.db"
chmod 600 "$APP_DIR/.env"

# Reiniciar aplicação
echo "Reiniciando aplicação..."
pm2 start helpdesk

echo "✅ Restauração concluída!"
```

```bash
# Tornar executável
chmod +x /home/helpdesk/restore-helpdesk.sh
```

## 🔧 Troubleshooting Comum

### 1. Problemas de Email

#### Email não é enviado
```bash
# Verificar configuração nos logs
pm2 logs helpdesk | grep -i smtp

# Testar conexão SMTP manualmente
telnet smtp.gmail.com 587

# Verificar variáveis de ambiente
cd /home/helpdesk/app
grep SMTP .env

# Testar configuração de email via Node.js
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'seu-email@gmail.com',
    pass: 'sua-senha-de-app'
  }
});
transporter.verify().then(console.log).catch(console.error);
"
```

#### Erro "Authentication failed"
```bash
# Para Gmail, verificar se:
# 1. Autenticação de 2 fatores está habilitada
# 2. Senha de aplicativo foi gerada corretamente
# 3. Está usando a senha de aplicativo, não a senha normal

# Para outros provedores, verificar:
# 1. Usuário e senha estão corretos
# 2. SMTP_HOST e SMTP_PORT estão corretos
# 3. SMTP_SECURE está configurado corretamente
```

#### Emails vão para spam
```bash
# Configurar SPF record no DNS:
# "v=spf1 include:_spf.google.com ~all" (para Gmail)

# Configurar DKIM se possível
# Usar domínio corporativo no EMAIL_FROM
```

### 2. Problemas de Performance

#### Alta utilização de memória
```bash
# Verificar uso de memória
pm2 monit

# Ajustar limite de memória no ecosystem.config.js
nano ecosystem.config.js
# Alterar: max_memory_restart: '512M'

# Reiniciar aplicação
pm2 restart helpdesk
```

#### Aplicação lenta
```bash
# Verificar logs de erro
pm2 logs helpdesk --err

# Otimizar banco SQLite
sqlite3 /home/helpdesk/app/helpdesk.db "VACUUM;"

# Verificar tamanho do banco
ls -lh /home/helpdesk/app/helpdesk.db

# Verificar espaço em disco
df -h /home/helpdesk/
```

### 3. Problemas de Conectividade

#### Nginx não conecta na aplicação
```bash
# Verificar se aplicação está rodando
pm2 status helpdesk

# Verificar se porta 3000 está ouvindo
netstat -tlnp | grep 3000

# Testar conexão local
curl http://localhost:3000/

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/helpdesk.error.log
```

#### Erro 502 Bad Gateway
```bash
# Verificar se aplicação está rodando
pm2 restart helpdesk

# Verificar logs da aplicação
pm2 logs helpdesk

# Verificar configuração do Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 4. Problemas de Upload

#### Upload de arquivos falha
```bash
# Verificar permissões do diretório
ls -la /home/helpdesk/app/uploads/
chmod 755 /home/helpdesk/app/uploads/

# Verificar espaço em disco
df -h /home/helpdesk/

# Verificar logs para erros de upload
pm2 logs helpdesk | grep -i upload

# Testar upload pequeno
curl -X POST http://localhost:3000/api/upload/test \
  -F "file=@/etc/passwd"
```

#### Arquivo muito grande
```bash
# Verificar configuração no .env
grep MAX_FILE_SIZE /home/helpdesk/app/.env

# Verificar configuração do Nginx
sudo grep client_max_body_size /etc/nginx/sites-available/helpdesk

# Ajustar ambos se necessário e reiniciar serviços
```

## 📋 Checklist Final de Deploy

Antes de considerar o deploy concluído, verifique:

### ✅ Infraestrutura
- [ ] Node.js 20+ instalado e funcionando
- [ ] PM2 instalado globalmente
- [ ] Nginx instalado e configurado
- [ ] Firewall configurado (SSH, HTTP, HTTPS)
- [ ] SSL configurado com Let's Encrypt
- [ ] Usuário helpdesk criado com permissões adequadas

### ✅ Aplicação
- [ ] Código da aplicação transferido
- [ ] Dependências instaladas (`npm install --production`)
- [ ] Build realizado com sucesso (`npm run build`)
- [ ] Arquivo .env configurado com todas as variáveis
- [ ] SESSION_SECRET único gerado
- [ ] Diretórios uploads, logs, backups criados
- [ ] Permissões de arquivo adequadas

### ✅ Banco de Dados
- [ ] Banco SQLite criado automaticamente
- [ ] Usuário admin criado e testado
- [ ] Usuário técnico criado e testado
- [ ] Login admin funcionando
- [ ] Login técnico funcionando

### ✅ Sistema de Email
- [ ] Variáveis SMTP configuradas no .env
- [ ] Configuração de email testada
- [ ] Ticket de teste criado para verificar email
- [ ] Email de criação recebido
- [ ] Email de atribuição recebido
- [ ] Sem erros de SMTP nos logs

### ✅ Funcionalidades
- [ ] Abertura de chamados funcionando
- [ ] Dashboard admin acessível
- [ ] Dashboard técnico acessível
- [ ] Upload de arquivos funcionando
- [ ] Download de arquivos funcionando
- [ ] Sistema de comentários funcionando
- [ ] Relatórios carregando dados
- [ ] Notificações por email funcionando

### ✅ Monitoramento
- [ ] PM2 mostrando status "online"
- [ ] Logs sendo gerados sem erros
- [ ] Nginx proxy funcionando
- [ ] SSL redirecionando HTTPS corretamente
- [ ] Backup automático configurado
- [ ] Scripts de manutenção criados

### ✅ Segurança
- [ ] Todas as senhas padrão alteradas
- [ ] SESSION_SECRET único configurado
- [ ] Arquivo .env protegido (chmod 600)
- [ ] Banco SQLite protegido (chmod 600)
- [ ] Firewall UFW habilitado
- [ ] Headers de segurança configurados no Nginx

### ✅ Performance
- [ ] Compressão Gzip habilitada
- [ ] Cache de arquivos estáticos configurado
- [ ] Rate limiting configurado
- [ ] Limites de memória configurados no PM2
- [ ] Teste de carga básico realizado

## 🎯 URLs de Acesso Final

Após deploy completo, o sistema estará disponível em:

- **URL Principal:** `https://seu-dominio.com`
- **Dashboard Admin:** `https://seu-dominio.com/admin`
- **Dashboard Técnico:** `https://seu-dominio.com/technician`
- **API Endpoints:** `https://seu-dominio.com/api/*`

### Credenciais Padrão (ALTERE IMEDIATAMENTE):
- **Admin:** 
  - Usuário: `admin`
  - Senha: `Admin123!@#`
- **Técnico:**
  - Usuário: `tecnico1` 
  - Senha: `Tech123!@#`

## 📞 Suporte e Manutenção

### Comandos Úteis para Manutenção

```bash
# Status geral do sistema
pm2 status && sudo systemctl status nginx

# Reiniciar tudo
pm2 restart helpdesk && sudo systemctl restart nginx

# Ver logs em tempo real
pm2 logs helpdesk --lines 50

# Fazer backup manual
sudo /home/helpdesk/backup-helpdesk.sh

# Verificar uso de recursos
htop && df -h

# Verificar conectividade
curl -I https://seu-dominio.com
```

### Atualizações do Sistema

```bash
# Para atualizar a aplicação:
cd /home/helpdesk/app
pm2 stop helpdesk
# Substituir arquivos da aplicação
npm install --production
npm run build
pm2 start helpdesk
```

---

**✨ Sistema Helpdesk IT com Notificações por Email**  
*Deploy Guide Completo - Versão 4.0*  
*Atualizado: Setembro 2025*

*Agora com sistema completo de notificações automáticas por email e configuração detalhada para diferentes provedores SMTP!*