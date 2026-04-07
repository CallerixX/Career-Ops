// ============================================================
// /jobs — Список всех вакансий
// ============================================================

import { db } from '@/lib/db'
import { jobs, evaluations, applications } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { Briefcase, ExternalLink, TrendingUp } from 'lucide-react'
import { cn, formatRelativeDate, formatSalary, getScoreColor, getScoreGrade } from '@/lib/utils'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/db/schema'
import type { ApplicationStatus } from '@/lib/db/schema'

export default async function JobsPage() {
  const rows = await db
    .select({
      id: jobs.id, company: jobs.company, roleTitle: jobs.roleTitle,
      jdUrl: jobs.jdUrl, source: jobs.source, isRemote: jobs.isRemote,
      salaryMin: jobs.salaryMin, salaryMax: jobs.salaryMax, salaryCurrency: jobs.salaryCurrency,
      createdAt: jobs.createdAt, scrapeStatus: jobs.scrapeStatus,
      overallScore: evaluations.overallScore, evalStatus: evaluations.status,
      appStatus: applications.status,
    })
    .from(jobs)
    .leftJoin(evaluations, eq(evaluations.jobId, jobs.id))
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .orderBy(desc(jobs.createdAt))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Вакансии</h1>
          <p className="text-muted-foreground mt-1">{rows.length} вакансий в базе</p>
        </div>
        <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">
          <TrendingUp className="w-4 h-4" /> Добавить вакансию
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Вакансий пока нет</p>
          <p className="text-sm opacity-70 mt-1">Вернитесь на главную и вставьте URL вакансии</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <Link
              key={row.id}
              href={`/jobs/${row.id}`}
              className={cn('flex items-center gap-4 p-5 glass-hover rounded-2xl group animate-slide-in')}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
                {row.company?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{row.roleTitle || '—'}</div>
                <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3">
                  <span className="truncate">{row.company || '—'}</span>
                  {row.isRemote && <span className="text-emerald-400 shrink-0">· Удалённо</span>}
                  {(row.salaryMin || row.salaryMax) && (
                    <span className="shrink-0">· {formatSalary(row.salaryMin, row.salaryMax, row.salaryCurrency ?? 'RUB')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">{formatRelativeDate(row.createdAt)}</span>
                {row.overallScore != null && row.evalStatus === 'done' && (
                  <span className={cn('text-lg font-bold', getScoreColor(row.overallScore))}>
                    {getScoreGrade(row.overallScore)}
                  </span>
                )}
                {row.appStatus && (
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium text-white', STATUS_COLORS[row.appStatus as ApplicationStatus])}>
                    {STATUS_LABELS[row.appStatus as ApplicationStatus]}
                  </span>
                )}
                <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
