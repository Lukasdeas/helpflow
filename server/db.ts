import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

console.log("Usando SQLite local para desenvolvimento");

// Usar SQLite local temporariamente para resolver problemas de conectividade
const sqlite = new Database('./helpdesk.db');
export const db = drizzle(sqlite, { schema });

// Criar tabelas se não existirem
try {
  // Habilitar foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON;');
  
  // Criar tabelas
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'technician',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);
  
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      ticket_number INTEGER UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      sector TEXT NOT NULL,
      problem_type TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      requester_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      assigned_to_id TEXT REFERENCES users(id),
      accepted_at DATETIME,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      attachments TEXT DEFAULT '[]'
    );
  `);
  
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_type TEXT NOT NULL,
      attachments TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);
  
  console.log("Tabelas SQLite inicializadas com sucesso");
} catch (error) {
  console.error("Erro ao inicializar tabelas SQLite:", error);
}
