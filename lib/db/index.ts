// ============================================================
// Синглтон подключения к SQLite через Drizzle ORM
// Используем better-sqlite3 — синхронный, быстрый, без бинарных зависимостей
// ============================================================

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import * as schema from './schema'

// Определяем путь к файлу БД относительно корня проекта
const DB_PATH = path.join(process.cwd(), 'career-ops.db')

// Глобальный синглтон — предотвращает множественные подключения в dev-режиме (hot reload)
const globalForDb = global as unknown as {
  db: ReturnType<typeof drizzle> | undefined
  sqlite: Database.Database | undefined
}

function createDb() {
  const sqlite = new Database(DB_PATH)

  // Оптимизации производительности для SQLite
  sqlite.pragma('journal_mode = WAL')   // Write-Ahead Logging — быстрее для concurrent reads
  sqlite.pragma('synchronous = NORMAL') // Баланс между скоростью и надёжностью
  sqlite.pragma('cache_size = -64000')  // 64MB кэш (у пользователя 32GB RAM)
  sqlite.pragma('foreign_keys = ON')    // Включаем проверку внешних ключей

  return { sqlite, db: drizzle(sqlite, { schema }) }
}

// В dev-режиме сохраняем в global во избежание утечек при hot reload
if (!globalForDb.db) {
  const { sqlite, db } = createDb()
  globalForDb.sqlite = sqlite
  globalForDb.db = db
}

export const db = globalForDb.db!
export const sqlite = globalForDb.sqlite!

// Типы для удобного использования в роутах
export type DB = typeof db
