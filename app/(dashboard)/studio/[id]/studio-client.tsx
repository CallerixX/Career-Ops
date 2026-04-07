'use client'
// ============================================================
// Studio Client — split-pane редактор с подсветкой ATS-слов
// Слева: текст вакансии | Справа: адаптированное резюме
// ============================================================

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, FileText, PenTool, Zap, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Job, Evaluation } from '@/lib/db/schema'

interface StudioClientProps {
  job: Job
  evaluation: Evaluation | null
}

export function StudioClient({ job, evaluation }: StudioClientProps) {
  const [copied, setCopied] = useState(false)
  const [resumeContent, setResumeContent] = useState(evaluation?.adaptedResume ?? '')

  const atsKeywords: string[] = useMemo(() => {
    try { return JSON.parse(evaluation?.atsKeywords ?? '[]') } catch { return [] }
  }, [evaluation])

  // Подсвечиваем ATS-ключевые слова в тексте вакансии
  const highlightedJD = useMemo(() => {
    if (!job.jdText || atsKeywords.length === 0) return job.jdText ?? ''
    let text = job.jdText
    atsKeywords.forEach(kw => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      text = text.replace(
        new RegExp(`(${escaped})`, 'gi'),
        `<mark class="ats-keyword" style="background:none;border:none;padding:0">$1</mark>`
      )
    })
    return text
  }, [job.jdText, atsKeywords])

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const copyResume = () => {
    navigator.clipboard.writeText(resumeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadPdf = async () => {
    if (!resumeContent) return
    try {
      setIsGeneratingPdf(true)
      
      const payload = new URLSearchParams()
      if (evaluation?.id && resumeContent === evaluation.adaptedResume) {
        payload.set('evalId', evaluation.id)
      } else {
        payload.set('text', resumeContent)
      }

      // Открываем загрузку в текущем окне (или новой вкладке)
      window.open(`/api/pdf/generate?${payload.toString()}`, '_blank')
    } catch (err) {
      console.error(err)
      alert('Ошибка при скачивании PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col animate-fade-in">
      {/* Верхняя панель */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href={`/jobs/${job.id}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Назад
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <h1 className="font-semibold">{job.roleTitle || 'Студия'}</h1>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-sm text-muted-foreground">{job.company}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* ATS-слова */}
          {atsKeywords.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Zap className="w-3.5 h-3.5" />
              <span>{atsKeywords.length} ATS-слов подсвечено</span>
            </div>
          )}
          <button
            onClick={downloadPdf}
            disabled={isGeneratingPdf || !resumeContent}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
          >
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Скачать PDF
          </button>
          
          <button
            onClick={copyResume}
            disabled={!resumeContent}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-sm font-medium transition-all"
          >
            {copied ? <><Check className="w-4 h-4 text-emerald-400" /> Скопировано</> : <><Copy className="w-4 h-4" /> Скопировать</>}
          </button>
        </div>
      </div>

      {/* Split-pane */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Левая панель: текст вакансии */}
        <div className="flex-1 glass rounded-2xl gradient-border flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 shrink-0">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium">Описание вакансии</span>
            <span className="text-xs text-muted-foreground ml-auto">ATS-слова подсвечены</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {job.jdText ? (
              <div
                className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono-terminal [&_mark]:ats-keyword [&_mark]:inline"
                dangerouslySetInnerHTML={{ __html: highlightedJD }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
                Текст вакансии недоступен
              </div>
            )}
          </div>
        </div>

        {/* Правая панель: адаптированное резюме */}
        <div className="flex-1 glass rounded-2xl gradient-border flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 shrink-0">
            <PenTool className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium">Адаптированное резюме</span>
            <span className="text-xs text-muted-foreground ml-auto">Markdown</span>
          </div>
          <div className="flex-1 min-h-0">
            <textarea
              value={resumeContent}
              onChange={e => setResumeContent(e.target.value)}
              placeholder={evaluation ? '' : 'Сначала выполните анализ вакансии на главной странице'}
              className={cn(
                'w-full h-full p-4 bg-transparent text-sm font-mono-terminal leading-relaxed',
                'outline-none resize-none text-slate-300',
                'placeholder:text-muted-foreground/30'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
