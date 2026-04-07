'use client'

// ============================================================
// Боковая навигация Career-Ops
// Client Component — использует usePathname для активных ссылок
// ============================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap,
  Kanban,
  Briefcase,
  PenTool,
  Settings,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  {
    href: '/',
    icon: Zap,
    label: 'Командный Центр',
    sublabel: 'Анализ вакансий',
  },
  {
    href: '/board',
    icon: Kanban,
    label: 'Доска',
    sublabel: 'Канбан-трекинг',
  },
  {
    href: '/jobs',
    icon: Briefcase,
    label: 'Вакансии',
    sublabel: 'Все оценки',
  },
  {
    href: '/studio',
    icon: PenTool,
    label: 'Студия',
    sublabel: 'Редактор резюме',
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Настройки',
    sublabel: 'Профиль и ключи',
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40 glass border-r border-white/5">
      {/* Логотип */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center neon-glow">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold gradient-text">Career-Ops</h1>
            <p className="text-xs text-muted-foreground">Job Search OS</p>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          // Точное совпадение для главной, prefix для остальных
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-violet-400' : 'group-hover:text-foreground'
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.label}</div>
                <div className="text-xs text-muted-foreground/70 truncate">{item.sublabel}</div>
              </div>
              {isActive && (
                <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Подвал sidebar */}
      <div className="p-4 border-t border-white/5">
        <div className="glass rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">
            <span className="text-violet-400 font-medium">v0.1.0</span> · локальный режим
          </p>
        </div>
      </div>
    </aside>
  )
}
