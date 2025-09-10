
const { Pool } = require('pg');
const { hashPassword } = require('../server/auth.ts');

// Função para criar hash de senha (compatível com o sistema)
function createHash(password) {
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function criarUsuarios() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Conectando ao banco de dados...');
    
    // Criar usuário admin com senha: admin123
    const adminPassword = createHash('admin123');
    await pool.query(`
      INSERT INTO users (username, password, name, email, role) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO UPDATE SET password = $2
    `, ['admin', adminPassword, 'Administrador', 'admin@empresa.com', 'admin']);
    
    console.log('Usuário admin criado/atualizado - Login: admin | Senha: admin123');

    // Criar usuário técnico com senha: tech123
    const techPassword = createHash('tech123');
    await pool.query(`
      INSERT INTO users (username, password, name, email, role) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO UPDATE SET password = $2
    `, ['tecnico1', techPassword, 'João Silva', 'joao@empresa.com', 'technician']);
    
    console.log('Usuário técnico criado/atualizado - Login: tecnico1 | Senha: tech123');

    // Verificar se os usuários foram criados
    const result = await pool.query('SELECT username, name, role FROM users ORDER BY role, username');
    console.log('\nUsuários no banco:');
    result.rows.forEach(user => {
      console.log(`- ${user.username} (${user.name}) - ${user.role}`);
    });

  } catch (error) {
    console.error('Erro ao criar usuários:', error);
  } finally {
    await pool.end();
  }
}

criarUsuarios();
