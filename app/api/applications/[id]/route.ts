// ============================================================
// /api/applications/[id] — PATCH: обновление статуса отклика
// Используется Kanban-доской для перетаскивания карточек
// ============================================================

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { applications, APPLICATION_STATUSES } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nowUnix } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/applications/[id]'>
) {
  const { id } = await ctx.params

  try {
    const body = await request.json()
    const { status, notes, nextAction, nextActionDate, contactName, contactEmail, coverLetter } = body

    // Валидируем статус если он передан
    if (status && !APPLICATION_STATUSES.includes(status)) {
      return Response.json(
        { error: `Недопустимый статус: ${status}. Разрешено: ${APPLICATION_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { updatedAt: nowUnix() }
    if (status !== undefined) {
      updateData.status = status
      // Фиксируем дату подачи при переходе в "applied"
      if (status === 'applied') updateData.appliedAt = nowUnix()
    }
    if (notes !== undefined) updateData.notes = notes
    if (nextAction !== undefined) updateData.nextAction = nextAction
    if (nextActionDate !== undefined) updateData.nextActionDate = nextActionDate
    if (contactName !== undefined) updateData.contactName = contactName
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail
    if (coverLetter !== undefined) updateData.coverLetter = coverLetter

    await db.update(applications).set(updateData).where(eq(applications.id, id))

    return Response.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка БД'
    return Response.json({ error: msg }, { status: 500 })
  }
}
