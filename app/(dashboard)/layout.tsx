// ============================================================
// Layout дашборда — обёртка с Sidebar для всех внутренних страниц
// ============================================================

import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      {/* Основной контент — смещён на ширину sidebar */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-6 max-w-screen-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
