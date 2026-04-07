// ============================================================
// Схема базы данных Career-Ops — Drizzle ORM + SQLite
// ============================================================

import { sql, relations } from 'drizzle-orm'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ============================================================
// Профиль пользователя и Story Bank (STAR-достижения)
// ============================================================
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),

  fullName: text('full_name').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  location: text('location').notNull().default(''),
  linkedinUrl: text('linkedin_url').notNull().default(''),
  githubUrl: text('github_url').notNull().default(''),
  portfolioUrl: text('portfolio_url').notNull().default(''),

  // Профессиональный профиль
  summary: text('summary').notNull().default(''),
  cvMarkdown: text('cv_markdown').notNull().default(''), // CV в Markdown для AI

  // Story Bank — JSON массив STAR-достижений
  // Формат: [{ id, title, situation, task, action, result, keywords[], impact }]
  storyBank: text('story_bank').notNull().default('[]'),

  // Целевые параметры поиска
  targetRoles: text('target_roles').notNull().default('[]'),
  targetSalaryMin: integer('target_salary_min'),
  targetSalaryMax: integer('target_salary_max'),
  targetCurrency: text('target_currency').notNull().default('RUB'),
  targetLocations: text('target_locations').notNull().default('[]'),
  openToRemote: integer('open_to_remote', { mode: 'boolean' }).notNull().default(true),

  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
})

// ============================================================
// Вакансии — данные от парсера
// ============================================================
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),

  company: text('company').notNull().default(''),
  roleTitle: text('role_title').notNull().default(''),
  jdText: text('jd_text').notNull().default(''),   // Очищенный текст вакансии
  jdUrl: text('jd_url').notNull().default(''),      // Источник URL

  // Зарплатная вилка
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: text('salary_currency').notNull().default('RUB'),
  salaryPeriod: text('salary_period').notNull().default('month'), // month | year

  // Метаданные
  source: text('source').notNull().default(''),              // LinkedIn, HH.ru, и т.д.
  employmentType: text('employment_type').notNull().default(''),
  experienceLevel: text('experience_level').notNull().default(''),
  isRemote: integer('is_remote', { mode: 'boolean' }).notNull().default(false),
  companyLogoUrl: text('company_logo_url').notNull().default(''),

  // Статус скрапинга
  scrapeStatus: text('scrape_status').notNull().default('pending'), // pending | done | error
  scrapeError: text('scrape_error'),

  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
})

// ============================================================
// Оценки — AI-скоринг вакансии относительно профиля
// ============================================================
export const evaluations = sqliteTable('evaluations', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),

  // Общий балл (0–100)
  overallScore: real('overall_score').notNull().default(0),

  // JSON объект с 10 параметрами оценки (каждый 0–100):
  // tech_stack, seniority_match, culture_fit, salary_range,
  // growth_potential, location_logistics, domain_experience,
  // language_requirements, company_stability, role_clarity
  scoresJson: text('scores_json').notNull().default('{}'),

  // SWOT-анализ: { strengths[], weaknesses[], opportunities[], threats[] }
  swotJson: text('swot_json').notNull().default('{}'),

  // Стратегия подготовки к интервью (Markdown)
  interviewStrategy: text('interview_strategy').notNull().default(''),

  // ATS-ключевые слова — JSON string[]
  atsKeywords: text('ats_keywords').notNull().default('[]'),

  // Адаптированное резюме (Markdown)
  adaptedResume: text('adapted_resume').notNull().default(''),

  // Краткое саммари оценки
  summary: text('summary').notNull().default(''),

  // Полный сырой ответ AI — для отладки
  rawAiResponse: text('raw_ai_response').notNull().default(''),

  // Провайдер AI
  aiProvider: text('ai_provider').notNull().default('gemini'), // gemini | openrouter

  // Статус оценки
  status: text('status').notNull().default('pending'), // pending | processing | done | error
  errorMessage: text('error_message'),

  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
})

// ============================================================
// Отклики — трекинг кандидатуры по каждой вакансии
// ============================================================
export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),

  // Статус воронки: found → applied → interview → offer | rejected
  status: text('status', {
    enum: ['found', 'applied', 'interview', 'offer', 'rejected'],
  }).notNull().default('found'),

  // Даты
  appliedAt: integer('applied_at'),      // Unix timestamp — когда подали отклик
  interviewAt: integer('interview_at'),  // Unix timestamp — дата интервью

  // Сгенерированные документы
  pdfPath: text('pdf_path').notNull().default(''),           // Путь к PDF резюме
  coverLetter: text('cover_letter').notNull().default(''),   // Сопроводительное письмо

  // Заметки и следующий шаг
  notes: text('notes').notNull().default(''),
  nextAction: text('next_action').notNull().default(''),
  nextActionDate: integer('next_action_date'),

  // Контактное лицо (рекрутер / менеджер)
  contactName: text('contact_name').notNull().default(''),
  contactEmail: text('contact_email').notNull().default(''),
  contactLinkedin: text('contact_linkedin').notNull().default(''),

  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
})

// ============================================================
// TypeScript типы (выводятся из схемы автоматически)
// ============================================================
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert

export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert

export type Evaluation = typeof evaluations.$inferSelect
export type NewEvaluation = typeof evaluations.$inferInsert

export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert

// Статусы откликов
export const APPLICATION_STATUSES = ['found', 'applied', 'interview', 'offer', 'rejected'] as const
export type ApplicationStatus = typeof APPLICATION_STATUSES[number]

// Метки статусов на русском
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  found:     'Найдено',
  applied:   'Подано',
  interview: 'Интервью',
  offer:     'Оффер',
  rejected:  'Отказ',
}

// Цвета статусов для UI
export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  found:     'bg-slate-500',
  applied:   'bg-blue-500',
  interview: 'bg-amber-500',
  offer:     'bg-emerald-500',
  rejected:  'bg-red-500',
}

// ============================================================
// Drizzle Relations — нужны для db.query API с `with`
// ============================================================
export const jobsRelations = relations(jobs, ({ many }) => ({
  evaluations: many(evaluations),
  applications: many(applications),
}))

export const evaluationsRelations = relations(evaluations, ({ one }) => ({
  job: one(jobs, { fields: [evaluations.jobId], references: [jobs.id] }),
}))

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
}))

