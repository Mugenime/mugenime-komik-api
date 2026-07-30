"use client";

import React from "react";

interface Endpoint {
  id: string;
  title: string;
  method: string;
  path: string;
  description: string;
}

interface ApiOverviewProps {
  endpoints: Endpoint[];
  onSelectEndpoint: (id: string) => void;
}

export const ApiOverview: React.FC<ApiOverviewProps> = ({
  endpoints,
  onSelectEndpoint,
}) => {
  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4">
            API Overview
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed max-w-3xl">
            Welcome to the Unofficial Komikcast REST API dashboard. This API
            provides structured JSON responses for manga, manhwa, and manhua
            data from Komikcast, fully equipped with caching and bypass proxies
            to ensure reliability.
          </p>
        </div>

        {/* Star on GitHub */}
        <a
          href="https://github.com/Wakype/komikcast-api"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-zinc-300 text-sm font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Star on GitHub
        </a>
      </div>

      {/* Warning */}
      <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-500 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="text-amber-500 font-semibold mb-1">
              Rate Limit Warning
            </h3>
            <p className="text-amber-500/80 text-sm">
              If you are using the Vercel-hosted version of this API, please be
              aware that requests are aggressively rate-limited to stay within
              the Hobby tier limits. Local deployment is highly recommended for
              heavy scraping or automation tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Local Installation */}
      <div>
        <h2 className="text-xl font-bold text-zinc-100 mb-4">
          Local Installation (If you want to try locally)
        </h2>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-md p-4">
          <pre className="text-zinc-300 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
            <code className="block mb-2 text-emerald-400">
              # 1. Clone the repository
            </code>
            <code className="block mb-4">
              git clone https://github.com/Wakype/komikcast-api.git
            </code>

            <code className="block mb-2 text-emerald-400">
              # 2. Install dependencies (PNPM recommended)
            </code>
            <code className="block">pnpm install</code>
            <code className="block text-zinc-500"># or run</code>
            <code className="block mb-4">npm install</code>

            <code className="block mb-2 text-emerald-400">
              # 3. Environment Setup (.env.local)
            </code>
            <code className="block mb-1 text-zinc-500">
              # Copy .env.example to .env.local
            </code>
            <code className="block mb-2">cp .env.example .env.local</code>
            <code className="block mb-1 text-zinc-500">
              # Configure your proxy & API secrets in .env.local:
            </code>
            <code className="block text-zinc-400">
              MANGA_BASE_URL=https://be.komikcast.cc/
            </code>
            <code className="block text-zinc-400">
              WEBSHARE_PROXY_1=http://user:pass@ip:port
            </code>
            <code className="block text-zinc-400">
              SCRAPER_PROXY_URL_1=https://your-worker.workers.dev
            </code>
            <code className="block text-zinc-400">
              SCRAPER_API_KEY=your_scraperapi_key
            </code>
            <code className="block mb-4 text-zinc-400">
              BYPASS_SECRET=your_bypass_secret
            </code>

            <code className="block mb-2 text-emerald-400">
              # 4. Configure Scraping Strategy Priorities (libs/scraper.ts)
            </code>
            <code className="block mb-1 text-zinc-500">
              # Re-order SCRAPER_STRATEGY_QUEUE to adjust execution order:
            </code>
            <code className="block text-zinc-400">
              export const SCRAPER_STRATEGY_QUEUE = [
            </code>
            <code className="block text-zinc-400">
              {"  "}&quot;WebshareProxy&quot;, // 1. HTTP Residential Proxies
            </code>
            <code className="block text-zinc-400">
              {"  "}&quot;CustomProxy&quot;,   // 2. Cloudflare / Deno / Netlify Proxies
            </code>
            <code className="block text-zinc-400">
              {"  "}&quot;ScraperAPI&quot;,    // 3. ScraperAPI Fallback
            </code>
            <code className="block text-zinc-400">
              {"  "}&quot;DirectFetch&quot;,   // 4. Local Dev Machine Direct
            </code>
            <code className="block mb-4 text-zinc-400">];</code>

            <code className="block mb-2 text-emerald-400">
              # 5. Run development server & inspect logs
            </code>
            <code className="block">pnpm dev</code>
            <code className="block text-zinc-500">
              # Open http://localhost:3000/api to test endpoints & inspect live scraper.log
            </code>
          </pre>
        </div>
      </div>

      {/* Endpoints Grid */}
      <div>
        <h2 className="text-xl font-bold text-zinc-100 mb-4">
          Endpoints Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {endpoints.map((endpoint) => (
            <button
              key={endpoint.id}
              onClick={() => onSelectEndpoint(endpoint.id)}
              className="flex flex-col cursor-pointer text-left p-4 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  {endpoint.method}
                </span>
                <h3 className="text-zinc-200 font-medium group-hover:text-emerald-400 transition-colors">
                  {endpoint.title}
                </h3>
              </div>
              <code className="text-xs text-zinc-500 mb-3 truncate w-full">
                {endpoint.path}
              </code>
              <p className="text-sm text-zinc-400 line-clamp-2">
                {endpoint.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
