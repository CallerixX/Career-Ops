// ============================================================
// Command Center — главная страница Career-Ops
// Server Component: загружает статистику и последние вакансии из БД
// ============================================================

import { db } from '@/lib/db'
import { jobs, applications, evaluations } from '@/lib/db/schema'
import { sql, desc, eq } from 'drizzle-orm'
import { CommandCenterClient } from './command-center-client'

// Загружаем статистику и последние вакансии на сервере
async function getStats() {
  const [totalJobsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)

  const [totalAppsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)

  const [avgScoreRow] = await db
    .select({ avg: sql<number>`avg(overall_score)` })
    .from(evaluations)
    .where(sql`status = 'done'`)

  // Последние 5 вакансий с JOIN для оценок и откликов
  const recentJobsList = await db
    .select({
      id: jobs.id,
      company: jobs.company,
      roleTitle: jobs.roleTitle,
      createdAt: jobs.createdAt,
      evalScore: evaluations.overallScore,
      evalStatus: evaluations.status,
      appStatus: applications.status,
    })
    .from(jobs)
    .leftJoin(evaluations, eq(evaluations.jobId, jobs.id))
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .orderBy(desc(jobs.createdAt))
    .limit(5)

  // Нормализуем в нужный формат для клиента
  const recentJobs = recentJobsList.map(row => ({
    id: row.id,
    company: row.company,
    roleTitle: row.roleTitle,
    createdAt: row.createdAt,
    evaluations: row.evalScore != null
      ? [{ overallScore: row.evalScore, status: row.evalStatus ?? 'pending' }]
      : [],
    applications: row.appStatus
      ? [{ status: row.appStatus }]
      : [],
  }))

  return {
    totalJobs: totalJobsRow?.count ?? 0,
    totalApps: totalAppsRow?.count ?? 0,
    avgScore: Math.round(avgScoreRow?.avg ?? 0),
    recentJobs,
  }
}

export default async function CommandCenterPage() {
  const stats = await getStats()

  return <CommandCenterClient initialStats={stats} />
}
