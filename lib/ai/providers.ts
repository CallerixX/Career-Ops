// ============================================================
// AI провайдеры — переключение между OpenRouter и Gemini
// Основной: OpenRouter (qwen/qwen3.6-plus:free для тестирования)
// Запасной: Google Gemini
// ============================================================

import { createOpenAI } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

// OpenRouter провайдер (совместим с OpenAI API)
const openrouter = createOpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  headers: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Career-Ops',
  },
})

// Получаем активную модель на основе AI_PROVIDER в .env
export function getAIModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER ?? 'openrouter'

  if (provider === 'gemini') {
    const modelId = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
    return google(modelId)
  }

  // По умолчанию — OpenRouter
  const modelId = process.env.OPENROUTER_MODEL ?? 'qwen/qwen3.6-plus:free'
  return openrouter(modelId)
}

// Fallback-модель при ошибке основного провайдера
export function getFallbackModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER ?? 'openrouter'

  if (provider === 'gemini') {
    // Gemini упал — пробуем OpenRouter
    return openrouter(process.env.OPENROUTER_MODEL ?? 'qwen/qwen3.6-plus:free')
  }

  // OpenRouter упал — пробуем Gemini
  return google(process.env.GEMINI_MODEL ?? 'gemini-2.0-flash')
}

export function getProviderName(): string {
  const provider = process.env.AI_PROVIDER ?? 'openrouter'
  if (provider === 'gemini') return `Gemini (${process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'})`
  return `OpenRouter (${process.env.OPENROUTER_MODEL ?? 'qwen/qwen3.6-plus:free'})`
}
