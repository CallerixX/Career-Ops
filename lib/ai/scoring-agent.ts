// ============================================================
// Scoring Agent — AI-анализ вакансии относительно профиля кандидата
// Провайдер: OpenRouter (qwen/qwen3-6b-plus:free) / Gemini как fallback
// Вывод: строгий JSON для отрисовки графиков в UI
// ============================================================

import { generateText } from 'ai'
import { getAIModel, getFallbackModel, getProviderName } from './providers'

// ============================================================
// Типы выходных данных
// ============================================================
export interface ScoreBreakdown {
  tech_stack: number          // Совпадение технологического стека
  seniority_match: number     // Соответствие грейду
  culture_fit: number         // Культурная совместимость
  salary_range: number        // Соответствие зарплатных ожиданий
  growth_potential: number    // Потенциал карьерного роста
  location_logistics: number  // Локация / удалёнка
  domain_experience: number   // Опыт в индустрии/домене
  language_requirements: number // Языковые требования
  company_stability: number   // Стабильность компании
  role_clarity: number        // Чёткость и привлекательность роли
}

export interface ScoringResult {
  // Мета-данные вакансии (извлечённые AI)
  company: string
  roleTitle: string
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string
  isRemote: boolean
  source: string
  employmentType: string
  experienceLevel: string

  // AI-оценка
  overallScore: number        // Общий балл 0–100
  scores: ScoreBreakdown      // 10 параметров
  swot: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  atsKeywords: string[]       // Ключевые слова для ATS
  interviewStrategy: string   // Markdown — стратегия подготовки
  adaptedResume: string       // Markdown — адаптированное резюме
  summary: string             // Краткое резюме оценки (2-3 предложения)
}

// ============================================================
// Промпт скоринга
// ============================================================
function buildScoringPrompt(cvMarkdown: string, jdText: string): string {
  return `Ты — Senior HR-аналитик и карьерный коуч с 15-летним опытом.
Твоя задача — глубоко проанализировать вакансию и резюме кандидата, затем вернуть ТОЛЬКО валидный JSON (без markdown-блоков, без пояснений).

## РЕЗЮМЕ КАНДИДАТА:
${cvMarkdown.slice(0, 3000)}

## ТЕКСТ ВАКАНСИИ:
${jdText.slice(0, 4000)}

## ИНСТРУКЦИИ:
1. Извлеки из текста вакансии: компанию, название роли, зарплату, формат работы
2. Оцени совместимость кандидата и вакансии по 10 параметрам (0-100)
3. Проведи SWOT-анализ с конкретными пунктами
4. Выдели ключевые слова для ATS (релевантные к вакансии, отсутствующие в резюме)
5. Напиши стратегию интервью и адаптированное резюме

## ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ОТВЕТА (только JSON, без markdown):
{
  "company": "Название компании или пустая строка",
  "roleTitle": "Название роли",
  "salaryMin": null,
  "salaryMax": null,
  "salaryCurrency": "RUB",
  "isRemote": false,
  "source": "HH.ru",
  "employmentType": "Полная занятость",
  "experienceLevel": "Middle",
  "overallScore": 75,
  "scores": {
    "tech_stack": 80,
    "seniority_match": 75,
    "culture_fit": 70,
    "salary_range": 65,
    "growth_potential": 80,
    "location_logistics": 90,
    "domain_experience": 70,
    "language_requirements": 95,
    "company_stability": 75,
    "role_clarity": 85
  },
  "swot": {
    "strengths": ["Конкретный плюс 1", "Конкретный плюс 2"],
    "weaknesses": ["Конкретный минус 1", "Конкретный минус 2"],
    "opportunities": ["Возможность 1", "Возможность 2"],
    "threats": ["Угроза 1", "Угроза 2"]
  },
  "atsKeywords": ["ключевое_слово_1", "ключевое_слово_2"],
  "interviewStrategy": "# Стратегия интервью\\n\\nКонкретные советы...",
  "adaptedResume": "# Имя Фамилия\\n\\nАдаптированное резюме в Markdown...",
  "summary": "Краткое описание оценки за 2-3 предложения."
}

КРИТИЧЕСКИ ВАЖНО: Верни ТОЛЬКО JSON без какого-либо дополнительного текста, markdown-блоков (\`\`\`json) или пояснений.`
}

// ============================================================
// Основная функция скоринга
// ============================================================
export async function scoreJob(
  cvMarkdown: string,
  jdText: string,
  onLog: (msg: string, level?: 'info' | 'success' | 'error' | 'thinking') => void
): Promise<{ result: ScoringResult; provider: string; rawResponse: string }> {
  const prompt = buildScoringPrompt(cvMarkdown, jdText)

  onLog(`🤖 Запрашиваем AI (${getProviderName()})...`, 'thinking')
  onLog('⏳ Анализируем совместимость... (это займёт 15-60 секунд)', 'thinking')

  let rawText = ''
  let usedProvider = getProviderName()

  try {
    // Пробуем основной провайдер
    const { text } = await generateText({
      model: getAIModel(),
      prompt,
      maxOutputTokens: 4096,
      temperature: 0.3, // Низкая температура для стабильного JSON
    })
    rawText = text
  } catch (primaryErr) {
    const errMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr)
    onLog(`⚠️ Основной провайдер недоступен: ${errMsg.slice(0, 80)}`, 'error')
    onLog('🔄 Переключаемся на запасной провайдер...', 'thinking')

    try {
      const { text } = await generateText({
        model: getFallbackModel(),
        prompt,
        maxOutputTokens: 4096,
        temperature: 0.3,
      })
      rawText = text
      usedProvider = 'fallback'
    } catch (fallbackErr) {
      throw new Error(`Оба AI-провайдера недоступны. Проверь API ключи.`)
    }
  }

  onLog('📊 Получен ответ, парсим JSON...', 'thinking')

  // Парсим JSON из ответа (модель может обернуть в ```json)
  const parsed = extractJsonFromResponse(rawText)

  if (!parsed) {
    onLog('⚠️ AI вернул некорректный JSON, используем заготовку...', 'error')
    return {
      result: buildFallbackResult(rawText),
      provider: usedProvider,
      rawResponse: rawText,
    }
  }

  // Валидируем и нормализуем числа
  const result = normalizeResult(parsed)
  onLog(`✅ Скоринг завершён! Общий балл: ${result.overallScore}/100`, 'success')

  return { result, provider: usedProvider, rawResponse: rawText }
}

// ============================================================
// Вспомогательные функции
// ============================================================

function extractJsonFromResponse(text: string): Record<string, unknown> | null {
  // Попытка 1: убираем markdown-блоки ```json ... ```
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (mdMatch) {
    try { return JSON.parse(mdMatch[1]) } catch {}
  }

  // Попытка 2: ищем первый { ... } блок
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) } catch {}
  }

  // Попытка 3: весь текст как JSON
  try { return JSON.parse(text.trim()) } catch {}

  return null
}

function normalizeResult(raw: Record<string, unknown>): ScoringResult {
  const clamp = (v: unknown, def = 50) =>
    Math.min(100, Math.max(0, typeof v === 'number' ? Math.round(v) : def))

  const scores = (raw.scores ?? {}) as Record<string, unknown>

  return {
    company: String(raw.company ?? ''),
    roleTitle: String(raw.roleTitle ?? ''),
    salaryMin: typeof raw.salaryMin === 'number' ? raw.salaryMin : null,
    salaryMax: typeof raw.salaryMax === 'number' ? raw.salaryMax : null,
    salaryCurrency: String(raw.salaryCurrency ?? 'RUB'),
    isRemote: Boolean(raw.isRemote),
    source: String(raw.source ?? ''),
    employmentType: String(raw.employmentType ?? ''),
    experienceLevel: String(raw.experienceLevel ?? ''),

    overallScore: clamp(raw.overallScore),
    scores: {
      tech_stack: clamp(scores.tech_stack),
      seniority_match: clamp(scores.seniority_match),
      culture_fit: clamp(scores.culture_fit),
      salary_range: clamp(scores.salary_range),
      growth_potential: clamp(scores.growth_potential),
      location_logistics: clamp(scores.location_logistics),
      domain_experience: clamp(scores.domain_experience),
      language_requirements: clamp(scores.language_requirements),
      company_stability: clamp(scores.company_stability),
      role_clarity: clamp(scores.role_clarity),
    },
    swot: {
      strengths: toStringArray(raw.swot, 'strengths'),
      weaknesses: toStringArray(raw.swot, 'weaknesses'),
      opportunities: toStringArray(raw.swot, 'opportunities'),
      threats: toStringArray(raw.swot, 'threats'),
    },
    atsKeywords: Array.isArray(raw.atsKeywords)
      ? (raw.atsKeywords as unknown[]).map(String)
      : [],
    interviewStrategy: String(raw.interviewStrategy ?? ''),
    adaptedResume: String(raw.adaptedResume ?? ''),
    summary: String(raw.summary ?? ''),
  }
}

function toStringArray(obj: unknown, key: string): string[] {
  if (!obj || typeof obj !== 'object') return []
  const arr = (obj as Record<string, unknown>)[key]
  return Array.isArray(arr) ? arr.map(String) : []
}

function buildFallbackResult(rawText: string): ScoringResult {
  return {
    company: '', roleTitle: '', salaryMin: null, salaryMax: null,
    salaryCurrency: 'RUB', isRemote: false, source: '',
    employmentType: '', experienceLevel: '',
    overallScore: 0,
    scores: {
      tech_stack: 0, seniority_match: 0, culture_fit: 0, salary_range: 0,
      growth_potential: 0, location_logistics: 0, domain_experience: 0,
      language_requirements: 0, company_stability: 0, role_clarity: 0,
    },
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    atsKeywords: [],
    interviewStrategy: rawText.slice(0, 1000),
    adaptedResume: '',
    summary: 'Ошибка парсинга ответа AI. Проверьте rawAiResponse в БД.',
  }
}
