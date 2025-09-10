-- Script SQL para criar usuários iniciais com senhas hasheadas
-- Execute este script após o deploy inicial

-- IMPORTANTE: As senhas estão hasheadas usando PBKDF2
-- Senhas padrão: admin123, tech123, super123

-- Inserir usuário administrador
-- Senha: admin123
INSERT INTO users (username, password, name, email, role) 
VALUES ('admin', 'a3b5cade7b73c1804b19c5ac6ec9bf36:d6debb11af316d82b5adccd9d04aea2ce5b08a7eca49f83e68fa2733fc78f931199beaccb1d8a28d5702242766cd331dbb58362efcab1b91628095783b8a14bc', 'Administrador Sistema', 'admin@empresa.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Inserir técnicos de exemplo
-- Senhas: tech123 para todos
INSERT INTO users (username, password, name, email, role) 
VALUES 
    ('tecnico1', 'c808fbcb4c6fdce41e4759977954666b:7c7120e423f64a6cf30063eea3b41786daf27c36ec00048a1bfef388f216374ef79d85fe927bfd6a34978de98ee4465ab34b3b926a089cc2bc2923b832d8c719', 'João Silva', 'joao@empresa.com', 'technician'),
    ('tecnico2', 'c808fbcb4c6fdce41e4759977954666b:7c7120e423f64a6cf30063eea3b41786daf27c36ec00048a1bfef388f216374ef79d85fe927bfd6a34978de98ee4465ab34b3b926a089cc2bc2923b832d8c719', 'Maria Santos', 'maria@empresa.com', 'technician'),
    ('supervisor', '4937c7c677ebf6b80e0ec473455e972f:373d6149dfa1a257120a72cbfda56277ace9f8fd678ed4127317337f165ac50e57a6a196f6f194fdc28f8c40256621614d30aa2766d7fd1248ef079274aab606', 'Carlos Supervisor', 'carlos@empresa.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Verificar usuários criados
SELECT id, username, name, email, role, created_at 
FROM users 
ORDER BY created_at;

-- INSTRUÇÕES PARA TROCA DE SENHA:
-- As senhas serão automaticamente migradas para hash na primeira vez que o usuário fizer login
-- Ou você pode usar a API para criar novos usuários com senhas seguras:

-- Exemplo de consulta para verificar se senhas estão hasheadas:
-- SELECT username, 
--        CASE 
--            WHEN password LIKE '%:%' THEN 'Hash PBKDF2' 
--            ELSE 'Texto plano (inseguro)' 
--        END as senha_tipo
-- FROM users;