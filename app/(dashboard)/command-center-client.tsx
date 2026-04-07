'use client'

// ============================================================
// Command Center — клиентский интерактивный компонент
// URL-анализатор, Live Log терминал, статистика, последние вакансии
// ============================================================

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, Link as LinkIcon, Loader2, Terminal,
  Briefcase, CheckCircle, TrendingUp, Clock, ExternalLink,
  AlertCircle
} from 'lucide-react'
import { cn, formatRelativeDate, getScoreGrade, getScoreColor } from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/db/schema'
import type { ApplicationStatus } from '@/lib/db/schema'

interface LogLine {
  id: number
  text: string
  type: 'info' | 'success' | 'error' | 'thinking'
  ts: number
}

interface StatsData {
  totalJobs: number
  totalApps: number
  avgScore: number
  recentJobs: Array<{
    id: string
    company: string
    roleTitle: string
    createdAt: number
    evaluations: Array<{ overallScore: number; status: string }>
    applications: Array<{ status: string }>
  }>
}

export function CommandCenterClient({ initialStats }: { initialStats: StatsData }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(initialStats)
  const logIdRef = useRef(0)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Добавляем строку в Live Log
  const addLog = useCallback((text: string, type: LogLine['type'] = 'info') => {
    const line: LogLine = { id: ++logIdRef.current, text, type, ts: Date.now() }
    setLogs(prev => [...prev.slice(-50), line]) // храним последние 50 строк
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  // Запускаем анализ вакансии
  const handleAnalyze = async () => {
    if (!url.trim()) return
    setIsAnalyzing(true)
    setError(null)
    setLogs([])

    addLog(`🔗 Начинаем анализ: ${url}`, 'info')
    addLog('🌐 Запускаем Playwright...', 'thinking')

    try {
      const response = await fetch('/api/jobs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Неизвестная ошибка сервера')
      }

      // Читаем SSE-поток с логами и прогрессом
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('Не удалось получить поток ответа')

      let jobId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data:'))

        for (const line of lines) {
          const rawJson = line.replace('data: ', '').trim()
          if (!rawJson || rawJson === '[DONE]') continue

          try {
            const event = JSON.parse(rawJson)

            if (event.type === 'log') {
              addLog(event.message, event.level ?? 'info')
            } else if (event.type === 'done') {
              jobId = event.jobId
              addLog(`✅ Анализ завершён! ID вакансии: ${event.jobId}`, 'success')
            } else if (event.type === 'error') {
              addLog(`❌ Ошибка: ${event.message}`, 'error')
              setError(event.message)
            }
          } catch {
            // Игнорируем некорректный JSON в потоке
          }
        }
      }

      if (jobId) {
        // Переходим на страницу деталей после небольшой паузы
        setTimeout(() => router.push(`/jobs/${jobId}`), 800)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка анализа'
      setError(msg)
      addLog(`❌ ${msg}`, 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const LOG_COLORS: Record<LogLine['type'], string> = {
    info:     'text-slate-300',
    success:  'text-emerald-400',
    error:    'text-red-400',
    thinking: 'text-violet-400',
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Заголовок */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Командный Центр</h1>
        <p className="text-muted-foreground">
          Вставьте URL вакансии — AI проанализирует её и адаптирует ваше резюме
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Вакансий проанализировано', value: stats.totalJobs, icon: Briefcase, color: 'text-blue-400' },
          { label: 'Откликов отправлено', value: stats.totalApps, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Средний балл AI', value: stats.avgScore ? `${stats.avgScore}%` : '—', icon: TrendingUp, color: 'text-violet-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-5 gradient-border">
            <div className="flex items-center gap-3 mb-3">
              <stat.icon className={cn('w-5 h-5', stat.color)} />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{stat.value || '0'}</div>
          </div>
        ))}
      </div>

      {/* Главный блок анализа */}
      <div className="glass rounded-2xl p-8 gradient-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Магический Анализ</h2>
            <p className="text-sm text-muted-foreground">Парсинг → Скоринг → Адаптация резюме</p>
          </div>
        </div>

        {/* URL Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="job-url-input"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="https://hh.ru/vacancy/... или LinkedIn/Indeed/любой URL"
              disabled={isAnalyzing}
              className={cn(
                'w-full pl-11 pr-4 py-4 rounded-xl bg-white/5 border text-sm transition-all',
                'placeholder:text-muted-foreground/50 outline-none',
                'focus:border-violet-500/50 focus:bg-white/8 focus:ring-2 focus:ring-violet-500/20',
                isAnalyzing ? 'border-white/10 opacity-60 cursor-not-allowed' : 'border-white/10 hover:border-white/20'
              )}
            />
          </div>
          <button
            id="analyze-btn"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !url.trim()}
            className={cn(
              'flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm transition-all',
              'bg-violet-600 hover:bg-violet-500 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95 neon-glow'
            )}
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Анализирую...</>
            ) : (
              <><Zap className="w-4 h-4" /> Анализировать</>
            )}
          </button>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Live Log Терминал */}
        {logs.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Лог агента</span>
              {isAnalyzing && (
                <span className="flex items-center gap-1 text-xs text-violet-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  в работе
                </span>
              )}
            </div>
            <div className="bg-black/40 rounded-xl border border-white/5 p-4 h-48 overflow-y-auto font-mono-terminal">
              {logs.map(log => (
                <div key={log.id} className={cn('animate-log mb-0.5', LOG_COLORS[log.type])}>
                  <span className="text-white/20 select-none mr-2">
                    {new Date(log.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {log.text}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Последние вакансии */}
      {stats.recentJobs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Последние вакансии</h2>
          </div>
          <div className="space-y-3">
            {stats.recentJobs.map((job, i) => {
              const eval_ = job.evaluations[0]
              const app = job.applications[0]
              const score = eval_?.overallScore ?? 0
              const status = (app?.status ?? 'found') as ApplicationStatus

              return (
                <a
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className={cn(
                    'flex items-center gap-4 p-4 glass-hover rounded-xl group',
                    'animate-slide-in',
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Аватар компании */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0 text-sm font-bold text-slate-300">
                    {job.company.charAt(0).toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{job.roleTitle || 'Без названия'}</div>
                    <div className="text-sm text-muted-foreground truncate">{job.company} · {formatRelativeDate(job.createdAt)}</div>
                  </div>

                  {/* Оценка */}
                  {eval_ && eval_.status === 'done' && (
                    <div className={cn('text-lg font-bold', getScoreColor(score))}>
                      {getScoreGrade(score)}
                    </div>
                  )}

                  {/* Статус */}
                  <span className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium text-white',
                    STATUS_COLORS[status]
                  )}>
                    {STATUS_LABELS[status]}
                  </span>

                  <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Пустое состояние */}
      {stats.totalJobs === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">Вакансий пока нет</p>
          <p className="text-sm opacity-70">Вставьте URL вакансии выше, чтобы начать</p>
        </div>
      )}
    </div>
  )
}
