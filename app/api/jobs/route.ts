// ============================================================
// GET /api/jobs — список всех вакансий с оценками и откликами
// ============================================================

import { db } from '@/lib/db'
import { jobs, evaluations, applications } from '@/lib/db/schema'
import { desc, eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // JOIN: вакансии + последняя оценка + статус отклика
    const rows = await db
      .select({
        id: jobs.id,
        company: jobs.company,
        roleTitle: jobs.roleTitle,
        jdUrl: jobs.jdUrl,
        source: jobs.source,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        salaryCurrency: jobs.salaryCurrency,
        isRemote: jobs.isRemote,
        scrapeStatus: jobs.scrapeStatus,
        createdAt: jobs.createdAt,
        overallScore: evaluations.overallScore,
        evalStatus: evaluations.status,
        appStatus: applications.status,
      })
      .from(jobs)
      .leftJoin(evaluations, eq(evaluations.jobId, jobs.id))
      .leftJoin(applications, eq(applications.jobId, jobs.id))
      .orderBy(desc(jobs.createdAt))

    return Response.json({ jobs: rows })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка БД'
    return Response.json({ error: msg }, { status: 500 })
  }
}
