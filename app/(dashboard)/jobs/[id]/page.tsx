// ============================================================
// /jobs/[id] — Страница деталей вакансии
// Server Component: загружает данные, рендерит клиентский компонент
// ============================================================

import { db } from '@/lib/db'
import { jobs, evaluations, applications } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { JobDetailsClient } from './job-details-client'

export default async function JobDetailsPage(
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

  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.jobId, id))
    .limit(1)

  return (
    <JobDetailsClient
      job={job}
      evaluation={evaluation ?? null}
      application={application ?? null}
    />
  )
}
