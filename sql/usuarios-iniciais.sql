-- Script SQL para criar usuários iniciais do Sistema Helpdesk
-- Execute este script após o deploy inicial

-- IMPORTANTE: Altere as senhas após a primeira execução!

-- Inserir usuário administrador
INSERT INTO users (username, password, name, email, role) 
VALUES ('admin', 'admin123', 'Administrador Sistema', 'admin@empresa.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Inserir técnicos de exemplo
INSERT INTO users (username, password, name, email, role) 
VALUES 
    ('tecnico1', 'tech123', 'João Silva', 'joao@empresa.com', 'technician'),
    ('tecnico2', 'tech123', 'Maria Santos', 'maria@empresa.com', 'technician'),
    ('supervisor', 'super123', 'Carlos Supervisor', 'carlos@empresa.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Verificar usuários criados
SELECT id, username, name, email, role, created_at 
FROM users 
ORDER BY created_at;

-- ALTERAR SENHAS PADRÃO (exemplo)
-- UPDATE users SET password = 'nova_senha_segura' WHERE username = 'admin';
-- UPDATE users SET password = 'nova_senha_segura' WHERE username = 'tecnico1';
-- UPDATE users SET password = 'nova_senha_segura' WHERE username = 'tecnico2';
-- UPDATE users SET password = 'nova_senha_segura' WHERE username = 'supervisor';