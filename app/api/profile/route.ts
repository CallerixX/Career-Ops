// ============================================================
// /api/profile — GET / PUT профиля пользователя
// ============================================================

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { v4 as uuidv4 } from 'uuid'
import { nowUnix } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ── GET: получить профиль (первый и единственный) ──
export async function GET() {
  try {
    const profile = await db.select().from(profiles).limit(1)

    if (!profile[0]) {
      // Создаём пустой профиль при первом запросе
      const id = uuidv4()
      await db.insert(profiles).values({
        id,
        createdAt: nowUnix(),
        updatedAt: nowUnix(),
      })
      const created = await db.select().from(profiles).where(
        (await import('drizzle-orm')).eq(profiles.id, id)
      ).limit(1)
      return Response.json({ profile: created[0] })
    }

    return Response.json({ profile: profile[0] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка БД'
    return Response.json({ error: msg }, { status: 500 })
  }
}

// ── PUT: сохранить профиль ──
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Получаем текущий профиль
    const existing = await db.select().from(profiles).limit(1)

    if (existing[0]) {
      // Обновляем
      await db.update(profiles)
        .set({ ...body, updatedAt: nowUnix() })
        .where((await import('drizzle-orm')).eq(profiles.id, existing[0].id))
    } else {
      // Создаём первый раз
      await db.insert(profiles).values({
        id: uuidv4(),
        ...body,
        createdAt: nowUnix(),
        updatedAt: nowUnix(),
      })
    }

    const updated = await db.select().from(profiles).limit(1)
    return Response.json({ profile: updated[0], success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка БД'
    return Response.json({ error: msg }, { status: 500 })
  }
}
