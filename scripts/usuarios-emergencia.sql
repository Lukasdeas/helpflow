
-- Script de emergência para criar usuários com senhas em texto plano
-- Use apenas se o hash não estiver funcionando

-- Remover usuários existentes se houver
DELETE FROM users WHERE username IN ('admin', 'tecnico1');

-- Criar admin com senha em texto plano
INSERT INTO users (username, password, name, email, role) 
VALUES ('admin', 'admin123', 'Administrador', 'admin@empresa.com', 'admin');

-- Criar técnico com senha em texto plano  
INSERT INTO users (username, password, name, email, role) 
VALUES ('tecnico1', 'tech123', 'João Silva', 'joao@empresa.com', 'technician');

-- Verificar usuários criados
SELECT username, name, role, password FROM users ORDER BY role, username;
