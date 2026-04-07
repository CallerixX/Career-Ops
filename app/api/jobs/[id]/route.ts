// ============================================================
// /api/jobs/[id] — GET / PATCH / DELETE одной вакансии
// ============================================================

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobs, evaluations, applications } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nowUnix } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ── GET: полные данные вакансии + оценка + отклик ──
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/jobs/[id]'>
) {
  const { id } = await ctx.params

  try {
    const job = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)
    if (!job[0]) return Response.json({ error: 'Вакансия не найдена' }, { status: 404 })

    const evaluation = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.jobId, id))
      .limit(1)

    const application = await db
      .select()
      .from(applications)
      .where(eq(applications.jobId, id))
      .limit(1)

    return Response.json({
      job: job[0],
      evaluation: evaluation[0] ?? null,
      application: application[0] ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка БД'
    return Response.json({ error: msg }, { status: 500 })
  }
}

// ── PATCH: обновление заметок, статуса, контактов ──
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/jobs/[id]'>
) {
  const { id } = await ctx.params

  try {
    const body = await request.json()
    await db.update(jobs)
      .set({ ...body, updatedAt: nowUnix() })
      .where(eq(jobs.id, id))

    return Response.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка БД'
    return Response.json({ error: msg }, { status: 500 })
  }
}

// ── DELETE: удаление вакансии (каскадное удаление оценок и откликов) ──
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/jobs/[id]'>
) {
  const { id } = await ctx.params

  try {
    await db.delete(jobs).where(eq(jobs.id, id))
    return Response.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка БД'
    return Response.json({ error: msg }, { status: 500 })
  }
}
