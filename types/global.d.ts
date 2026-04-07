// ============================================================
// Глобальные TypeScript типы для Next.js 15 Route Handlers
// RouteContext — типизация params в route.ts файлах
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RouteContext<_Route extends string = string> = {
  params: Promise<Record<string, string>>
}
