// ============================================================
// /studio/[id] — Студия редактора резюме
// Side-by-side: текст вакансии слева, адаптированное резюме справа
// ============================================================

import { db } from '@/lib/db'
import { jobs, evaluations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { StudioClient } from './studio-client'

export default async function StudioPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)
  if (!job) notFound()

  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.jobId, id))
    .limit(1)

  return <StudioClient job={job} evaluation={evaluation ?? null} />
}
