'use client'
// ============================================================
// /board — Kanban-доска трекинга откликов
// ============================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ExternalLink, TrendingUp } from 'lucide-react'
import { cn, formatRelativeDate, getScoreGrade, getScoreColor } from '@/lib/utils'
import { APPLICATION_STATUSES, STATUS_LABELS, STATUS_COLORS } from '@/lib/db/schema'
import type { ApplicationStatus } from '@/lib/db/schema'

interface JobCard {
  id: string; company: string; roleTitle: string; jdUrl: string
  createdAt: number; overallScore?: number; evalStatus?: string; appStatus?: string
  appId?: string
}

const COLUMN_COLORS: Record<ApplicationStatus, string> = {
  found:     'border-slate-500/30',
  applied:   'border-blue-500/30',
  interview: 'border-amber-500/30',
  offer:     'border-emerald-500/30',
  rejected:  'border-red-500/30',
}

export default function BoardPage() {
  const [cards, setCards] = useState<JobCard[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)

  const fetchJobs = async () => {
    const res = await fetch('/api/jobs')
    const data = await res.json()
    setCards(data.jobs ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchJobs() }, [])

  const handleDragStart = (jobId: string) => setDragging(jobId)
  const handleDragEnd = () => setDragging(null)

  const handleDrop = async (targetStatus: ApplicationStatus, e: React.DragEvent) => {
    e.preventDefault()
    if (!dragging) return
    const card = cards.find(c => c.id === dragging)
    if (!card || card.appStatus === targetStatus) return

    // Оптимистичное обновление UI
    setCards(prev => prev.map(c =>
      c.id === dragging ? { ...c, appStatus: targetStatus } : c
    ))

    // Получаем application id через API
    try {
      const res = await fetch(`/api/jobs/${dragging}`)
      const { application } = await res.json()
      if (application) {
        await fetch(`/api/applications/${application.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus }),
        })
      }
    } catch {
      fetchJobs() // Откат при ошибке
    }

    setDragging(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Доска</h1>
        <p className="text-muted-foreground mt-1">Перетаскивайте карточки между колонками</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {APPLICATION_STATUSES.map((status) => {
          const colCards = cards.filter(c => (c.appStatus ?? 'found') === status)
          return (
            <div
              key={status}
              className={cn(
                'flex-shrink-0 w-72 rounded-2xl border glass p-4',
                COLUMN_COLORS[status]
              )}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(status, e)}
            >
              {/* Заголовок колонки */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_COLORS[status])} />
                  <span className="font-semibold text-sm">{STATUS_LABELS[status]}</span>
                </div>
                <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                  {colCards.length}
                </span>
              </div>

              {/* Карточки */}
              <div className="space-y-3 min-h-16">
                {colCards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => handleDragStart(card.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'p-4 rounded-xl glass-hover cursor-grab active:cursor-grabbing border border-white/5',
                      dragging === card.id && 'opacity-50 scale-95'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{card.roleTitle || '—'}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{card.company || '—'}</div>
                      </div>
                      {card.overallScore != null && card.evalStatus === 'done' && (
                        <span className={cn('text-sm font-bold shrink-0', getScoreColor(card.overallScore))}>
                          {getScoreGrade(card.overallScore)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{formatRelativeDate(card.createdAt)}</span>
                      <Link
                        href={`/jobs/${card.id}`}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}

                {colCards.length === 0 && (
                  <div className="h-16 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/50">Перетащите сюда</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
