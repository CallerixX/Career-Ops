'use client'

// ============================================================
// Job Details — клиентский компонент с визуализацией AI-оценки
// Radar Chart (Recharts), SWOT-матрица, стратегия интервью
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'
import {
  ArrowLeft, ExternalLink, PenTool, FileText, Loader2,
  TrendingUp, Shield, Zap, AlertTriangle, ChevronDown, ChevronUp,
  Briefcase, MapPin, Clock, DollarSign, Trash2, Download
} from 'lucide-react'
import {
  cn, getScoreColor, getScoreGrade, formatSalary,
  formatRelativeDate, formatDate
} from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS, APPLICATION_STATUSES } from '@/lib/db/schema'
import type { Job, Evaluation, Application, ApplicationStatus } from '@/lib/db/schema'

interface JobDetailsClientProps {
  job: Job
  evaluation: Evaluation | null
  application: Application | null
}

// Русские названия параметров радара
const SCORE_LABELS: Record<string, string> = {
  tech_stack: 'Стек',
  seniority_match: 'Грейд',
  culture_fit: 'Культура',
  salary_range: 'Зарплата',
  growth_potential: 'Рост',
  location_logistics: 'Локация',
  domain_experience: 'Домен',
  language_requirements: 'Языки',
  company_stability: 'Компания',
  role_clarity: 'Роль',
}

export function JobDetailsClient({ job, evaluation, application }: JobDetailsClientProps) {
  const router = useRouter()
  const [showJD, setShowJD] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Парсим оценки из JSON
  const scores = evaluation ? JSON.parse(evaluation.scoresJson || '{}') : {}
  const swot = evaluation ? JSON.parse(evaluation.swotJson || '{}') : {}
  const atsKeywords: string[] = evaluation ? JSON.parse(evaluation.atsKeywords || '[]') : []

  // Данные для radar chart
  const radarData = Object.entries(SCORE_LABELS).map(([key, label]) => ({
    subject: label,
    score: scores[key] ?? 0,
    fullMark: 100,
  }))

  const overallScore = evaluation?.overallScore ?? 0
  const appStatus = (application?.status ?? 'found') as ApplicationStatus

  // Обновление статуса отклика
  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!application || updatingStatus) return
    setUpdatingStatus(true)
    try {
      await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      router.refresh()
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Удаление вакансии
  const handleDelete = async () => {
    if (!confirm('Удалить вакансию? Это действие необратимо.')) return
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
    router.push('/')
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Хлебные крошки */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Командный Центр
        </Link>
        <span>/</span>
        <span className="text-foreground">{job.roleTitle || 'Вакансия'}</span>
      </div>

      {/* Заголовок вакансии */}
      <div className="glass rounded-2xl p-6 gradient-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Аватар компании */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {job.company?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{job.roleTitle || 'Без названия'}</h1>
              <p className="text-muted-foreground mt-1">{job.company || 'Компания не указана'}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                {job.jdUrl && (
                  <a href={job.jdUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> {job.source || 'Источник'}
                  </a>
                )}
                {(job.salaryMin || job.salaryMax) && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                  </span>
                )}
                {job.isRemote && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <MapPin className="w-3.5 h-3.5" /> Удалённо
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {formatRelativeDate(job.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Оценка-грейд */}
          {evaluation && evaluation.status === 'done' && (
            <div className="text-center shrink-0">
              <div className={cn('text-5xl font-black', getScoreColor(overallScore))}>
                {getScoreGrade(overallScore)}
              </div>
              <div className="text-muted-foreground text-sm mt-1">{overallScore}/100</div>
            </div>
          )}
        </div>

        {/* Статус + кнопки */}
        <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-white/5">
          {/* Смена статуса */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Статус:</span>
            <div className="flex gap-1.5">
              {APPLICATION_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={updatingStatus}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all',
                    appStatus === s
                      ? cn(STATUS_COLORS[s], 'text-white ring-2 ring-offset-1 ring-offset-background ring-current')
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  )}
                >
                  {updatingStatus && appStatus === s
                    ? <Loader2 className="w-3 h-3 animate-spin inline" />
                    : STATUS_LABELS[s]
                  }
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          {/* Кнопки действий */}
          {evaluation?.adaptedResume && (
            <button
              onClick={() => {
                setIsGeneratingPdf(true)
                window.open(`/api/pdf/generate?evalId=${evaluation.id}`, '_blank')
                setTimeout(() => setIsGeneratingPdf(false), 2000)
              }}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF-Резюме
            </button>
          )}
          <Link
            href={`/studio/${job.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
          >
            <PenTool className="w-4 h-4" /> Открыть в Студии
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 text-sm transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Грид: Radar Chart + SWOT */}
      {evaluation && evaluation.status === 'done' && (
        <div className="grid grid-cols-2 gap-6">

          {/* Radar Chart */}
          <div className="glass rounded-2xl p-6 gradient-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" /> Оценка по 10 параметрам
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <Radar
                  name="Оценка"
                  dataKey="score"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,20,40,0.9)',
                    border: '1px solid rgba(100,120,255,0.2)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                  formatter={(v: number) => [`${v}/100`, '']}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Детальные баллы */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {Object.entries(SCORE_LABELS).map(([key, label]) => {
                const score = scores[key] ?? 0
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${score}%`,
                            background: score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
                          }}
                        />
                      </div>
                      <span className={cn('text-xs font-medium w-7 text-right', getScoreColor(score))}>
                        {score}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SWOT-матрица */}
          <div className="glass rounded-2xl p-6 gradient-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" /> SWOT-анализ
            </h2>
            <div className="grid grid-cols-2 gap-3 h-[calc(100%-3rem)]">
              {[
                { key: 'strengths', label: 'Сильные стороны', color: 'border-emerald-500/30 bg-emerald-500/5', icon: '💪' },
                { key: 'weaknesses', label: 'Слабые стороны', color: 'border-red-500/30 bg-red-500/5', icon: '⚡' },
                { key: 'opportunities', label: 'Возможности', color: 'border-blue-500/30 bg-blue-500/5', icon: '🚀' },
                { key: 'threats', label: 'Риски', color: 'border-amber-500/30 bg-amber-500/5', icon: '⚠️' },
              ].map(({ key, label, color, icon }) => (
                <div key={key} className={cn('rounded-xl p-3 border', color)}>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    {icon} {label}
                  </div>
                  <ul className="space-y-1">
                    {(swot[key] ?? []).slice(0, 3).map((item: string, i: number) => (
                      <li key={i} className="text-xs text-foreground/80 flex items-start gap-1">
                        <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                    {!(swot[key]?.length) && (
                      <li className="text-xs text-muted-foreground italic">Нет данных</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ATS Ключевые слова */}
      {atsKeywords.length > 0 && (
        <div className="glass rounded-2xl p-6 gradient-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> ATS Ключевые слова
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Слова из вакансии, которые стоит добавить в резюме для прохождения ATS-фильтра:
          </p>
          <div className="flex flex-wrap gap-2">
            {atsKeywords.map((kw) => (
              <span key={kw} className="ats-keyword">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* Краткое резюме AI */}
      {evaluation?.summary && (
        <div className="glass rounded-2xl p-6 gradient-border">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-violet-400" /> Итоговый вывод AI
          </h2>
          <p className="text-muted-foreground leading-relaxed">{evaluation.summary}</p>
        </div>
      )}

      {/* Стратегия интервью (сворачиваемая) */}
      {evaluation?.interviewStrategy && (
        <div className="glass rounded-2xl overflow-hidden gradient-border">
          <button
            onClick={() => setShowStrategy(!showStrategy)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/3 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Стратегия интервью
            </h2>
            {showStrategy ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {showStrategy && (
            <div className="px-6 pb-6 prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
                {evaluation.interviewStrategy}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Текст вакансии (сворачиваемый) */}
      {job.jdText && (
        <div className="glass rounded-2xl overflow-hidden gradient-border">
          <button
            onClick={() => setShowJD(!showJD)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/3 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" /> Текст вакансии
            </h2>
            {showJD ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {showJD && (
            <div className="px-6 pb-6">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed max-h-96 overflow-y-auto">
                {job.jdText}
              </pre>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
