// ============================================================
// Playwright Job Scraper
// Скрапер вакансий — извлекает чистый текст со страницы вакансии
// Поддерживает: HH.ru, LinkedIn, HeadHunter, SuperJob и любые сайты
// ============================================================

import { chromium } from 'playwright'

export interface ScrapeResult {
  title: string       // Заголовок страницы
  company: string     // Название компании (из meta или заголовка)
  text: string        // Очищенный текст вакансии (< 8000 символов)
  charCount: number   // Количество извлечённых символов
}

// Селекторы мусора для удаления из DOM перед извлечением текста
const NOISE_SELECTORS = [
  'nav', 'footer', 'header', 'aside',
  'script', 'style', 'noscript', 'iframe',
  '[class*="cookie"]', '[class*="banner"]', '[class*="popup"]',
  '[class*="modal"]', '[class*="overlay"]', '[class*="ads"]',
  '[class*="advertisement"]', '.header', '.footer', '.sidebar',
  '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
]

// Приоритизированные селекторы для контента вакансии
const CONTENT_SELECTORS = [
  // HH.ru специфичные
  '.vacancy-description',
  '[data-qa="vacancy-description"]',
  '.bloko-gap',
  // LinkedIn специфичные
  '.description__text',
  '.show-more-less-html__markup',
  // SuperJob
  '.vacancy-description__text',
  // Общие
  '[class*="vacancy-body"]',
  '[class*="job-description"]',
  '[class*="job-body"]',
  '[class*="vacancy-text"]',
  '[class*="description"]',
  'article',
  'main',
  '[role="main"]',
  '#content',
  '.content',
]

// Проверяем, является ли URL вакансией HH.ru и извлекаем ID
function extractHhId(url: string): string | null {
  const match = url.match(/hh\.ru\/vacancy\/(\d+)/)
  return match ? match[1] : null
}

// Прямой запрос к публичному API HH.ru (без anti-bot)
async function scrapeHhApi(
  vacancyId: string,
  onLog: (msg: string, level?: 'info' | 'success' | 'error' | 'thinking') => void
): Promise<ScrapeResult> {
  onLog(`🔌 Используем HH.ru JSON API для вакансии #${vacancyId}...`, 'thinking')

  const res = await fetch(`https://api.hh.ru/vacancies/${vacancyId}`, {
    headers: {
      'User-Agent': 'Career-Ops/1.0 (personal job tracking tool)',
      'Accept': 'application/json',
    },
  })

  if (!res.ok) throw new Error(`HH.ru API: ${res.status} ${res.statusText}`)

  const data = await res.json()

  // Собираем текст вакансии из полей HH.ru API
  const description = String(data.description ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const keySkills = (data.key_skills ?? []).map((s: { name: string }) => s.name).join(', ')
  const salary = data.salary
    ? `Зарплата: ${data.salary.from ?? ''}–${data.salary.to ?? ''} ${data.salary.currency ?? 'RUB'}`
    : ''

  const text = [
    `Вакансия: ${data.name ?? ''}`,
    `Компания: ${data.employer?.name ?? ''}`,
    salary,
    `Опыт: ${data.experience?.name ?? ''}`,
    `Занятость: ${data.employment?.name ?? ''}`,
    `График: ${data.schedule?.name ?? ''}`,
    '',
    description,
    keySkills ? `Ключевые навыки: ${keySkills}` : '',
  ].filter(Boolean).join('\n')

  onLog(`✅ HH.ru API: ${text.length} символов`, 'success')

  return {
    title: String(data.name ?? ''),
    company: String(data.employer?.name ?? ''),
    text: text.slice(0, 8000),
    charCount: text.length,
  }
}

export async function scrapeJobUrl(
  url: string,
  onLog: (msg: string, level?: 'info' | 'success' | 'error' | 'thinking') => void
): Promise<ScrapeResult> {
  let browser = null

  try {
    // ── Особая обработка HH.ru через публичный JSON API ──
    const hhId = extractHhId(url)
    if (hhId) {
      return await scrapeHhApi(hhId, onLog)
    }

    onLog('🌐 Запускаем Chromium...', 'thinking')

    browser = await chromium.launch({
      headless: false,   // Видимый режим — обходит большинство anti-bot проверок
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-extensions',
        '--start-maximized',
      ],
    })

    const context = await browser.newContext({
      // Реалистичный user-agent
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'ru-RU',
      viewport: { width: 1440, height: 900 },
      // Скрываем признаки автоматизации
      javaScriptEnabled: true,
      extraHTTPHeaders: {
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
    })

    // Скрываем WebDriver флаг — ключевой метод обхода Cloudflare/JS-проверок
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] })
    })

    const page = await context.newPage()

    // Блокируем ненужные ресурсы для ускорения
    await page.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,mp4,mp3}', r => r.abort())

    onLog(`📡 Открываем страницу: ${url}`, 'info')

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })
    } catch {
      // networkidle может timeout — переключаемся на domcontentloaded
      onLog('⚠️ networkidle timeout, переключаемся...', 'thinking')
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
      } catch {
        // Последний шанс — но что загрузилось
        await page.goto(url, { waitUntil: 'commit', timeout: 15000 })
      }
    }

    // Ждём JS-рендеринг (критично для HH.ru, LinkedIn)
    await page.waitForTimeout(4000)

    // Прокрутка для активации lazy-load контента
    await page.evaluate(() => {
      window.scrollTo(0, (document.body ?? document.documentElement).scrollHeight)
    })
    await page.waitForTimeout(1000)

    onLog('🔍 Извлекаем текст вакансии...', 'thinking')

    const result = await page.evaluate(
      ({ noiseSelectors, contentSelectors }) => {
        // Удаляем шум из DOM
        noiseSelectors.forEach((sel: string) => {
          document.querySelectorAll(sel).forEach(el => el.remove())
        })

        // Безопасное получение текста из элемента
        function getElText(el: Element | null): string {
          if (!el) return ''
          return (el as HTMLElement).innerText ?? el.textContent ?? ''
        }

        // Ищем блок с описанием вакансии по приоритету
        let contentEl: Element | null = null
        for (const sel of contentSelectors) {
          const el = document.querySelector(sel)
          if (el && getElText(el).trim().length > 50) {
            contentEl = el
            break
          }
        }

        // Fallback: пробуем body → documentElement
        const root = contentEl ?? document.body ?? document.documentElement
        const rawText = getElText(root)

        // Чистим текст: убираем лишние пробелы и дублирующиеся переносы
        const cleanText = rawText
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/ {2,}/g, ' ')
          .trim()

        // Мета-данные компании
        const ogSiteName =
          (document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement | null)
            ?.content ?? ''
        const companyFromMeta =
          (document.querySelector('meta[name="author"]') as HTMLMetaElement | null)
            ?.content ?? ''

        // Дополнительно: количество элементов на странице для диагностики
        const elemCount = document.querySelectorAll('*').length

        return {
          text: cleanText.slice(0, 8000),
          charCount: cleanText.length,
          title: document.title ?? '',
          company: ogSiteName || companyFromMeta || '',
          elemCount,
        }
      },
      { noiseSelectors: NOISE_SELECTORS, contentSelectors: CONTENT_SELECTORS }
    )

    onLog(`📋 DOM: ${result.elemCount} элементов, текст: ${result.charCount} символов`, 'info')

    // Если evaluate вернул мало текста — пробуем fallback через page.content() + strip HTML
    let finalText = result.text
    let finalCharCount = result.charCount

    if (finalCharCount < 100) {
      onLog('⚠️ Мало текста из JS, пробуем HTML-парсинг...', 'thinking')
      try {
        const html = await page.content()
        // Простой strip HTML тегов
        const stripped = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s{2,}/g, ' ')
          .trim()
        if (stripped.length > finalCharCount) {
          finalText = stripped.slice(0, 8000)
          finalCharCount = stripped.length
          onLog(`📋 HTML-fallback: ${finalCharCount} символов`, 'info')
        }
      } catch {
        // Игнорируем ошибку fallback
      }
    }

    if (finalCharCount < 30) {
      throw new Error(
        `Не удалось извлечь текст вакансии (${finalCharCount} символов). Сайт возможно блокирует автоматический парсинг.`
      )
    }

    onLog(`✅ Извлечено ${finalCharCount} символов текста`, 'success')

    return {
      title: result.title,
      company: result.company,
      text: finalText,
      charCount: finalCharCount,
    }
  } finally {
    if (browser) {
      await browser.close()
      onLog('🔒 Браузер закрыт', 'info')
    }
  }
}
