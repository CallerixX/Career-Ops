import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 и playwright — нативные Node.js модули, не бандлим их
  serverExternalPackages: ['better-sqlite3', 'playwright', 'playwright-core'],

  // Разрешаем генерацию PDF в /public
  outputFileTracingIncludes: {
    '/api/**': ['./public/**/*'],
  },
};

export default nextConfig;
