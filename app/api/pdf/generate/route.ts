// ============================================================
// GET /api/pdf/generate
// Рендерит адаптированное резюме из Markdown в ATS-friendly PDF
// Использует Playwright для генерации идеальной верстки
// ============================================================

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { evaluations, jobs, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { chromium } from 'playwright'
import { marked } from 'marked'

// Этот роут запускает Playwright — только Node.js runtime
export const runtime = 'nodejs'
// Отключаем кэширование
export const dynamic = 'force-dynamic'
// Генерация PDF может занимать до 15-20 секунд
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const evalId = searchParams.get('evalId')
    const resumeText = searchParams.get('text') // Альтернативный способ — передать текст напрямую (например, из Студии без сохранения)

    let markdown = ''
    let filename = 'Resume.pdf'

    if (resumeText) {
      // Использовать напрямую переданный текст
      markdown = resumeText
    } else if (evalId) {
      // Получить из БД
      const evalRow = await db
        .select({
          adaptedResume: evaluations.adaptedResume,
          jobId: evaluations.jobId,
        })
        .from(evaluations)
        .where(eq(evaluations.id, evalId))
        .limit(1)

      if (!evalRow[0]) {
        return new Response('Оценка не найдена', { status: 404 })
      }

      markdown = evalRow[0].adaptedResume || ''

      // Пытаемся сформировать красивое имя файла из вакансии
      if (evalRow[0].jobId) {
        const jobRow = await db.select().from(jobs).where(eq(jobs.id, evalRow[0].jobId)).limit(1)
        if (jobRow[0]) {
          const role = (jobRow[0].roleTitle || 'Job').replace(/[^a-zA-Z0-а-яА-Я]/g, '_')
          const company = (jobRow[0].company || 'Company').replace(/[^a-zA-Z0-а-яА-Я]/g, '_')
          
          // Получаем имя из профиля
          const profile = await db.select({ fullName: profiles.fullName }).from(profiles).limit(1)
          const name = profile[0]?.fullName ? profile[0].fullName.split(' ')[0].replace(/[^a-zA-Z0-а-яА-Я]/g, '') : 'CV'
          
          filename = `${name}_${role}_${company}.pdf`
        }
      }
    } else {
      return new Response('Укажите evalId или text', { status: 400 })
    }

    if (!markdown || markdown.trim() === '') {
      return new Response('Резюме пусто', { status: 400 })
    }

    // 1. Конвертация Markdown -> HTML
    const contentHtml = await marked.parse(markdown)

    // 2. ATS-Friendly HTML/CSS Шаблон
    const html = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <style>
          /* Базовые стили для ATS/PDF */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          :root {
            --text-color: #1a1a1c;
            --muted-color: #52525b;
            --accent-color: #4f46e5;
            --link-color: #2563eb;
            --border-color: #e4e4e7;
          }
          
          @page {
            size: A4;
            margin: 20mm;
          }

          body {
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: var(--text-color);
            margin: 0;
            padding: 0;
            background: white;
            text-rendering: optimizeLegibility;
          }

          /* Типографика */
          h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            line-height: 1.3;
            color: var(--text-color);
            margin-top: 1.2em;
            margin-bottom: 0.5em;
          }

          h1 { font-size: 24pt; margin-top: 0; margin-bottom: 0.2em; text-transform: uppercase; letter-spacing: 1px; color: var(--accent-color); }
          h2 { font-size: 14pt; border-bottom: 2px solid var(--border-color); padding-bottom: 4px; margin-top: 1.5em; text-transform: uppercase; letter-spacing: 0.5px; }
          h3 { font-size: 12pt; margin-bottom: 0.2em; }
          h4 { font-size: 11pt; font-weight: 500; color: var(--muted-color); margin-top: 0; }

          p { margin-top: 0; margin-bottom: 0.8em; }
          
          a { color: var(--link-color); text-decoration: none; word-break: break-all; }
          
          ul, ol { margin-top: 0; margin-bottom: 1em; padding-left: 1.5em; }
          li { margin-bottom: 0.3em; }

          /* Оптимизация для ATS (убираем сложные структуры таблиц если не нужны) */
          table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
          th, td { text-align: left; padding: 6px; border-bottom: 1px solid var(--border-color); }

          /* Коды и блоки */
          code { font-family: monospace; font-size: 0.9em; background: #f4f4f5; padding: 2px 4px; border-radius: 3px; }
          pre { background: #f4f4f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          blockquote { border-left: 3px solid var(--border-color); margin-left: 0; padding-left: 1em; color: var(--muted-color); }
          
          hr { border: 0; border-top: 1px solid var(--border-color); margin: 2em 0; }
          
          /* Utility */
          .text-muted { color: var(--muted-color); }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
      </html>
    `

    // 3. Генерация PDF через Playwright
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })
    
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true, // Использовать @page из CSS
    })

    await browser.close()

    // 4. Возвращаем PDF
    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Resume.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })

  } catch (err: unknown) {
    console.error('PDF Gen Error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(`Ошибка генерации PDF: ${msg}`, { status: 500 })
  }
}
