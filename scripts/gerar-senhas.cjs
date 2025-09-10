// Script para gerar hashes das senhas padrão
const { createHash, randomBytes, pbkdf2Sync } = require('crypto');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

console.log('=== SENHAS HASHEADAS PARA USUÁRIOS INICIAIS ===');
console.log('admin123:', hashPassword('admin123'));
console.log('tech123:', hashPassword('tech123'));
console.log('super123:', hashPassword('super123'));
console.log('==============================================');