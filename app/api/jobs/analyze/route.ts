// ============================================================
// POST /api/jobs/analyze
// Главный AI-роут: скрапинг → скоринг → сохранение в БД
// Использует SSE (Server-Sent Events) для live-лога в UI
// ============================================================

import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import { jobs, evaluations, applications, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { scrapeJobUrl } from '@/lib/scraper/job-scraper'
import { scoreJob } from '@/lib/ai/scoring-agent'
import { extractDomain, nowUnix } from '@/lib/utils'

// Этот роут запускает Playwright — только Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Долгий таймаут для локального dev (scraping + AI = до 90 сек)
export const maxDuration = 120

export async function POST(request: NextRequest) {
  // Парсим тело запроса
  let jobUrl: string
  try {
    const body = await request.json()
    jobUrl = String(body.url ?? '').trim()
  } catch {
    return Response.json({ error: 'Некорректный JSON в теле запроса' }, { status: 400 })
  }

  if (!jobUrl || !jobUrl.startsWith('http')) {
    return Response.json({ error: 'Укажите корректный URL вакансии (начинается с http)' }, { status: 400 })
  }

  // ============================================================
  // SSE поток — передаём логи в реальном времени
  // ============================================================
  // TransformStream<Uint8Array> — writer.write принимает Uint8Array из TextEncoder
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Функция отправки SSE-события
  const send = async (data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    } catch {
      // Клиент отключился — игнорируем
    }
  }

  // Функция отправки лог-строки
  const log = async (
    message: string,
    level: 'info' | 'success' | 'error' | 'thinking' = 'info'
  ) => {
    await send({ type: 'log', message, level })
  }

  // Запускаем основную логику асинхронно (не блокируем ответ)
  ;(async () => {
    let jobId: string | null = null

    try {
      // ── Шаг 1: Создаём запись вакансии в БД со статусом pending ──
      jobId = uuidv4()
      await db.insert(jobs).values({
        id: jobId,
        jdUrl: jobUrl,
        source: extractDomain(jobUrl),
        scrapeStatus: 'pending',
        createdAt: nowUnix(),
        updatedAt: nowUnix(),
      })
      await log(`🆕 Вакансия создана в БД (id: ${jobId.slice(0, 8)}...)`)

      // ── Шаг 2: Скрапинг страницы ──
      const scrapeResult = await scrapeJobUrl(jobUrl, (msg, level) => {
        log(msg, level)
      })

      // Обновляем запись с извлечённым текстом
      await db.update(jobs)
        .set({
          jdText: scrapeResult.text,
          company: scrapeResult.company,
          scrapeStatus: 'done',
          updatedAt: nowUnix(),
        })
        .where(eq(jobs.id, jobId))

      // ── Шаг 3: Загружаем профиль кандидата ──
      await log('👤 Загружаем ваш профиль...')
      const profile = await db.select().from(profiles).limit(1)
      const cv = profile[0]?.cvMarkdown ?? ''

      if (!cv || cv.length < 20) {
        await log('⚠️ Профиль не заполнен. Скоринг будет менее точным.', 'error')
      }

      // ── Шаг 4: AI-скоринг ──
      const evalId = uuidv4()
      await db.insert(evaluations).values({
        id: evalId,
        jobId,
        status: 'processing',
        createdAt: nowUnix(),
        updatedAt: nowUnix(),
      })

      const { result, provider, rawResponse } = await scoreJob(
        cv || '# Профиль не заполнен\nЗайдите в Настройки и добавьте резюме.',
        scrapeResult.text,
        (msg, level) => { log(msg, level) }
      )

      // ── Шаг 5: Сохраняем результаты в БД ──
      await log('💾 Сохраняем результаты в базу данных...', 'thinking')

      // Обновляем вакансию с данными из AI
      await db.update(jobs)
        .set({
          company: result.company || scrapeResult.company,
          roleTitle: result.roleTitle,
          salaryMin: result.salaryMin ?? undefined,
          salaryMax: result.salaryMax ?? undefined,
          salaryCurrency: result.salaryCurrency,
          isRemote: result.isRemote,
          source: result.source || extractDomain(jobUrl),
          employmentType: result.employmentType,
          experienceLevel: result.experienceLevel,
          updatedAt: nowUnix(),
        })
        .where(eq(jobs.id, jobId))

      // Сохраняем оценку
      await db.update(evaluations)
        .set({
          overallScore: result.overallScore,
          scoresJson: JSON.stringify(result.scores),
          swotJson: JSON.stringify(result.swot),
          interviewStrategy: result.interviewStrategy,
          atsKeywords: JSON.stringify(result.atsKeywords),
          adaptedResume: result.adaptedResume,
          summary: result.summary,
          rawAiResponse: rawResponse.slice(0, 10000), // Ограничиваем размер
          aiProvider: provider,
          status: 'done',
          updatedAt: nowUnix(),
        })
        .where(eq(evaluations.id, evalId))

      // Создаём запись отклика со статусом "Найдено"
      const appId = uuidv4()
      await db.insert(applications).values({
        id: appId,
        jobId,
        status: 'found',
        createdAt: nowUnix(),
        updatedAt: nowUnix(),
      })

      await log('✅ Всё готово! Открываем страницу результатов...', 'success')
      await send({ type: 'done', jobId })

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      await log(`❌ Ошибка: ${msg}`, 'error')
      await send({ type: 'error', message: msg })

      // Помечаем вакансию как ошибочную в БД
      if (jobId) {
        try {
          await db.update(jobs)
            .set({ scrapeStatus: 'error', scrapeError: msg, updatedAt: nowUnix() })
            .where(eq(jobs.id, jobId))
        } catch {}
      }
    } finally {
      try { await writer.close() } catch {}
    }
  })()

  // Возвращаем SSE-поток немедленно — логика работает в фоне
  return new Response(stream.readable as unknown as BodyInit, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Отключаем буферизацию Nginx
    },
  })
}
