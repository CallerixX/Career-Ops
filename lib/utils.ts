// ============================================================
// Общие утилиты приложения
// ============================================================

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Утилита для объединения CSS классов (shadcn/ui паттерн)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Форматирование зарплаты
export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency = 'RUB',
  period = 'month'
): string {
  const periodLabel = period === 'month' ? '/мес' : '/год'
  const curr = currency === 'RUB' ? '₽' : currency === 'USD' ? '$' : currency

  if (!min && !max) return 'Не указана'
  if (min && max) return `${formatNumber(min)} – ${formatNumber(max)} ${curr}${periodLabel}`
  if (min) return `от ${formatNumber(min)} ${curr}${periodLabel}`
  return `до ${formatNumber(max!)} ${curr}${periodLabel}`
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU')
}

// Форматирование даты из Unix timestamp
export function formatDate(ts?: number | null): string {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(ts * 1000))
}

// Форматирование относительного времени ("3 дня назад")
export function formatRelativeDate(ts?: number | null): string {
  if (!ts) return '—'
  const diff = Date.now() - ts * 1000
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'сегодня'
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн. назад`
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`
  return formatDate(ts)
}

// Цвет оценки по баллу (0-100)
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

// Буква-грейд оценки (A-F)
export function getScoreGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

// Извлечение домена из URL (для отображения источника)
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

// Текущий Unix timestamp
export function nowUnix(): number {
  return Math.floor(Date.now() / 1000)
}
