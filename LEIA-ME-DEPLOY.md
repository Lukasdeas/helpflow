# 🚀 Como Fazer Deploy do Sistema Helpdesk

Este sistema de helpdesk foi projetado para ser **100% self-contained** e fácil de fazer deploy em qualquer servidor Linux.

## 📋 Características do Sistema

- ✅ **SQLite local** - Sem necessidade de PostgreSQL externo
- ✅ **Armazenamento local** - Uploads salvos localmente
- ✅ **Zero dependências externas** - Funciona offline após instalação
- ✅ **Deploy simplificado** - Poucos passos para produção

## 📁 Arquivos de Deploy

### 📖 Documentação
- **`deploy-guide.md`** - Guia completo de deploy (LEIA PRIMEIRO!)
- **`LEIA-ME-DEPLOY.md`** - Este arquivo com instruções básicas

### ⚙️ Configuração
- **`ecosystem.config.js`** - Configuração do PM2 para produção
- **`nginx.conf.example`** - Configuração do Nginx

## 🏃‍♂️ Início Rápido

### 1. Preparar Servidor
```bash
# Instalar Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx

# Instalar PM2
sudo npm install -g pm2
```

### 2. Fazer Upload dos Arquivos
```bash
# Criar usuário para aplicação
sudo adduser helpdesk
sudo usermod -aG sudo helpdesk

# Copiar arquivos para /home/helpdesk/app/
# (use scp, rsync ou git clone)
```

### 3. Deploy da Aplicação
```bash
cd /home/helpdesk/app

# Instalar dependências
npm install --production

# Criar configuração
nano .env
# NODE_ENV=production
# PORT=3000
# SESSION_SECRET="sua_chave_secreta_aqui"

# Build e iniciar
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Configurar Nginx
```bash
# Copiar configuração
sudo cp nginx.conf.example /etc/nginx/sites-available/helpdesk
sudo ln -s /etc/nginx/sites-available/helpdesk /etc/nginx/sites-enabled/

# Testar e reiniciar
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Criar Usuários Iniciais
```bash
# A aplicação criará o banco SQLite automaticamente
# Criar usuários via API:
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","name":"Admin","email":"admin@empresa.com","role":"admin"}'

curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"tecnico1","password":"tech123","name":"Técnico","email":"tecnico@empresa.com","role":"technician"}'
```

## 🔄 Atualizações

Para atualizar o sistema:
```bash
cd /home/helpdesk/app

# Fazer backup
cp helpdesk.db helpdesk.db.backup
tar -czf uploads-backup.tar.gz uploads/

# Atualizar código
# (copiar novos arquivos ou git pull)

# Reinstalar dependências e rebuild
npm install --production
npm run build

# Reiniciar aplicação
pm2 restart helpdesk
```

## 💾 Backup e Restauração

### Fazer Backup
```bash
# Backup simples
cp /home/helpdesk/app/helpdesk.db /backups/helpdesk-$(date +%Y%m%d).db
tar -czf /backups/uploads-$(date +%Y%m%d).tar.gz -C /home/helpdesk/app uploads/
```

### Restaurar Backup
```bash
# Parar aplicação
pm2 stop helpdesk

# Restaurar banco SQLite
cp /backups/helpdesk-YYYYMMDD.db /home/helpdesk/app/helpdesk.db

# Restaurar uploads
tar -xzf /backups/uploads-YYYYMMDD.tar.gz -C /home/helpdesk/app/

# Reiniciar
pm2 start helpdesk
```

## 📊 Monitoramento

```bash
# Status da aplicação
pm2 status

# Logs em tempo real
pm2 logs helpdesk

# Métricas detalhadas
pm2 monit
```

## 🆘 Problemas Comuns

### Aplicação não inicia
```bash
# Ver logs da aplicação
pm2 logs helpdesk --lines 50

# Verificar processo
pm2 status
```

### Erro de banco SQLite
```bash
# Verificar se arquivo existe
ls -la /home/helpdesk/app/helpdesk.db

# Verificar integridade
sqlite3 /home/helpdesk/app/helpdesk.db "PRAGMA integrity_check;"

# Verificar permissões
chmod 600 /home/helpdesk/app/helpdesk.db
chown helpdesk:helpdesk /home/helpdesk/app/helpdesk.db
```

### Nginx não conecta
```bash
# Testar configuração
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/helpdesk.error.log

# Verificar se aplicação está rodando
curl http://localhost:3000/
```

## 🔐 Segurança

**IMPORTANTE:** Após o deploy:
1. ✅ Altere TODAS as senhas padrão via interface web
2. ✅ Configure `SESSION_SECRET` único no .env
3. ✅ Configure firewall: `sudo ufw enable && sudo ufw allow ssh,http,https`
4. ✅ Configure SSL: `sudo certbot --nginx -d seu-dominio.com`
5. ✅ Configure backup automático (cron)
6. ✅ Proteja arquivo SQLite: `chmod 600 helpdesk.db`

## 📞 Suporte

- Consulte o **`deploy-guide.md`** para instruções detalhadas
- Verifique os logs: `pm2 logs helpdesk`
- Monitor aplicação: `pm2 status`
- Monitor Nginx: `sudo systemctl status nginx`

## 💡 Vantagens do Sistema Atual

- ✅ **Deploy em minutos** - Sem configuração complexa de banco
- ✅ **Zero dependências externas** - Tudo em um servidor
- ✅ **Backup simples** - Apenas 1 arquivo .db + pasta uploads
- ✅ **Baixo uso de recursos** - 1GB RAM suficiente
- ✅ **Manutenção fácil** - Logs centralizados no PM2

---

**✨ Seu sistema de helpdesk está pronto para produção!**

*URLs de acesso após deploy:*
- **Público:** `https://seu-dominio.com`
- **Admin:** Login com `admin` / `admin123` (ALTERE!)
- **Técnico:** Login com `tecnico1` / `tech123` (ALTERE!)*

*Sistema agora 100% self-contained com SQLite!*