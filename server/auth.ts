import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * Cria hash de senha usando PBKDF2 (mais seguro que MD5/SHA1)
 * Compatível com Vite, não requer dependências externas
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifica se a senha fornecida corresponde ao hash armazenado
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    console.log(`Verificando senha. Hash armazenado: ${storedHash}`);
    
    // Verificar se é uma senha em texto plano (compatibilidade)
    if (!storedHash.includes(':')) {
      console.log('Senha em texto plano detectada');
      const result = password === storedHash;
      console.log(`Comparação texto plano: ${result}`);
      return result;
    }
    
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) {
      console.log('Hash inválido - faltando salt ou hash');
      return false;
    }
    
    console.log(`Salt: ${salt}, Hash: ${hash}`);
    const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    console.log(`Hash calculado: ${verifyHash}`);
    
    const result = hash === verifyHash;
    console.log(`Verificação de hash: ${result}`);
    return result;
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
}

/**
 * Migra senha de texto plano para hash
 * Usado durante o login para atualizar senhas antigas
 */
export function needsPasswordUpdate(storedHash: string): boolean {
  return !storedHash.includes(':');
}