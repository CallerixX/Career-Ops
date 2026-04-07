// ============================================================
// Скрипт инициализации БД — создаёт дефолтный профиль при первом запуске
// Запуск: npx tsx scripts/init-db.ts
// ============================================================

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import * as schema from '../lib/db/schema'

const DB_PATH = path.join(process.cwd(), 'career-ops.db')
const MIGRATIONS_PATH = path.join(process.cwd(), 'drizzle/migrations')

async function initDb() {
  console.log('🗄️  Инициализация базы данных Career-Ops...')

  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })

  // Применяем миграции
  console.log('📦 Применяем миграции...')
  migrate(db, { migrationsFolder: MIGRATIONS_PATH })
  console.log('✅ Миграции применены')

  // Проверяем — есть ли уже профиль
  const existing = db.select().from(schema.profiles).limit(1).all()
  if (existing.length > 0) {
    console.log('👤 Профиль уже существует, пропускаем')
    sqlite.close()
    return
  }

  // Создаём дефолтный профиль
  const profileId = uuidv4()
  db.insert(schema.profiles).values({
    id: profileId,
    fullName: 'Ваше Имя',
    email: 'your@email.com',
    cvMarkdown: '# Ваше Резюме\n\nЗаполните ваш профиль в разделе Настройки.',
    storyBank: JSON.stringify([]),
    targetRoles: JSON.stringify(['Senior Developer', 'Lead Engineer']),
    targetCurrency: 'RUB',
    openToRemote: true,
  }).run()

  console.log(`✅ Дефолтный профиль создан (id: ${profileId})`)
  console.log('🚀 База данных готова к работе!')

  sqlite.close()
}

initDb().catch(console.error)
