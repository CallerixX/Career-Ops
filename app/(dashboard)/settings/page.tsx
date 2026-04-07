'use client'
// ============================================================
// /settings — Страница настроек: профиль, CV и API ключи
// ============================================================

import { useState, useEffect } from 'react'
import { Save, User, Key, Loader2, CheckCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
  id?: string; fullName: string; email: string; phone: string; location: string
  linkedinUrl: string; githubUrl: string; summary: string; cvMarkdown: string
  targetRoles: string; targetSalaryMin?: number; targetSalaryMax?: number
  targetCurrency: string; openToRemote: boolean
}

const DEFAULT_PROFILE: Profile = {
  fullName: '', email: '', phone: '', location: '',
  linkedinUrl: '', githubUrl: '', summary: '', cvMarkdown: '',
  targetRoles: '[]', targetSalaryMin: undefined, targetSalaryMax: undefined,
  targetCurrency: 'RUB', openToRemote: true,
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'cv' | 'keys'>('profile')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(({ profile: p }) => { if (p) setProfile(p) })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const field = (
    label: string, key: keyof Profile, placeholder = '',
    type: 'input' | 'textarea' = 'input', rows = 4
  ) => (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">{label}</label>
      {type === 'textarea' ? (
        <textarea
          rows={rows}
          value={String(profile[key] ?? '')}
          onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground/40 resize-none font-mono-terminal transition-all"
        />
      ) : (
        <input
          type="text"
          value={String(profile[key] ?? '')}
          onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground/40 transition-all"
        />
      )}
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Настройки</h1>
        <p className="text-muted-foreground mt-1">Профиль, резюме и ключи API</p>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 p-1 glass rounded-xl w-fit">
        {([
          { id: 'profile', label: 'Профиль', icon: User },
          { id: 'cv', label: 'Резюме (CV)', icon: FileText },
          { id: 'keys', label: 'API Ключи', icon: Key },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-violet-600 text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Профиль */}
      {activeTab === 'profile' && (
        <div className="glass rounded-2xl p-6 gradient-border space-y-4">
          <h2 className="text-lg font-semibold">Личные данные</h2>
          <div className="grid grid-cols-2 gap-4">
            {field('Имя и фамилия', 'fullName', 'Иван Иванов')}
            {field('Email', 'email', 'ivan@example.com')}
            {field('Телефон', 'phone', '+7 (999) 123-45-67')}
            {field('Город/локация', 'location', 'Москва, Россия')}
            {field('LinkedIn URL', 'linkedinUrl', 'https://linkedin.com/in/...')}
            {field('GitHub URL', 'githubUrl', 'https://github.com/...')}
          </div>
          {field('Профессиональное саммари', 'summary',
            'Краткое описание опыта и целей (2-4 предложения)...', 'textarea', 3)}
          <div className="grid grid-cols-3 gap-4">
            {field('Мин. зарплата', 'targetSalaryMin', '150000')}
            {field('Макс. зарплата', 'targetSalaryMax', '250000')}
            {field('Валюта', 'targetCurrency', 'RUB')}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="remote"
              checked={Boolean(profile.openToRemote)}
              onChange={e => setProfile(p => ({ ...p, openToRemote: e.target.checked }))}
              className="w-4 h-4 accent-violet-500"
            />
            <label htmlFor="remote" className="text-sm text-muted-foreground">
              Рассматриваю удалённую работу
            </label>
          </div>
        </div>
      )}

      {/* Резюме */}
      {activeTab === 'cv' && (
        <div className="glass rounded-2xl p-6 gradient-border space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Резюме в формате Markdown</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Это резюме используется AI для скоринга вакансий и генерации адаптированных версий.
              Чем подробнее — тем точнее анализ.
            </p>
          </div>
          {field('', 'cvMarkdown',
            '# Иван Иванов\nSenior Frontend Developer\n\n## Опыт\n- 5 лет в React/TypeScript\n...',
            'textarea', 25
          )}
        </div>
      )}

      {/* API Ключи (read-only info) */}
      {activeTab === 'keys' && (
        <div className="glass rounded-2xl p-6 gradient-border space-y-4">
          <h2 className="text-lg font-semibold">API Ключи</h2>
          <p className="text-sm text-muted-foreground">
            Ключи хранятся только в файле <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">.env.local</code> на вашем компьютере и никуда не передаются.
          </p>
          <div className="space-y-3">
            {[
              { label: 'GEMINI_API_KEY', desc: 'Google Gemini API (запасной провайдер)' },
              { label: 'OPENROUTER_API_KEY', desc: 'OpenRouter — Claude, GPT-4, Qwen (основной)' },
              { label: 'OPENROUTER_MODEL', desc: 'Модель OpenRouter (по умолчанию: qwen/qwen3-6b-plus:free)' },
              { label: 'AI_PROVIDER', desc: 'Активный провайдер: openrouter | gemini' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-xl bg-white/3 border border-white/5">
                <Key className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <code className="text-sm font-mono text-violet-300">{label}</code>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground bg-white/3 p-3 rounded-lg">
            📁 Отредактируйте файл <strong>d:\python project\py-career-ops\.env.local</strong> чтобы изменить ключи. После изменения перезапустите dev-сервер.
          </p>
        </div>
      )}

      {/* Кнопка сохранения */}
      {activeTab !== 'keys' && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all disabled:opacity-50 neon-glow"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</>
            ) : saved ? (
              <><CheckCircle className="w-4 h-4" /> Сохранено!</>
            ) : (
              <><Save className="w-4 h-4" /> Сохранить</>
            )}
          </button>
          {saved && (
            <span className="text-sm text-emerald-400 animate-fade-in">
              ✅ Данные сохранены успешно
            </span>
          )}
        </div>
      )}
    </div>
  )
}
