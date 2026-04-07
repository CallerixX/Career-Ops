// ============================================================
// Обертка для /studio если зашли без ID
// ============================================================

import Link from 'next/link'
import { Briefcase } from 'lucide-react'

export default function StudioEmptyPage() {
  return (
    <div className="h-[calc(100vh-6rem)] flex items-center justify-center animate-fade-in">
      <div className="glass rounded-2xl p-8 max-w-md text-center flex flex-col items-center">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 text-violet-400">
          <Briefcase className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold mb-2">Не выбрана вакансия</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Студия адаптирует резюме под конкретные требования. Пожалуйста, откройте нужную вакансию из списка и нажмите «Открыть в Студии».
        </p>
        <Link 
          href="/jobs"
          className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
        >
          Перейти к вакансиям
        </Link>
      </div>
    </div>
  )
}
