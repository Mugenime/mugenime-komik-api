import Link from "next/link";
import Squares from "@/components/Squares";

export default function Home() {
  return (
    <div className="relative flex flex-col w-full min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Squares
          speed={0.1}
          squareSize={70}
          direction="diagonal"
          borderColor="#18181b"
          hoverFillColor="#27272a"
        />
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-5xl mx-auto w-full">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-medium border border-zinc-800 rounded-full bg-zinc-900/50 text-zinc-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500"></span>
          </span>
          <span>Fast & Reliable Scraper API</span>
        </div>

        {/* Hero Typography */}
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-zinc-100">
          Komikcast Unofficial API
        </h1>

        <p className="text-base md:text-lg text-zinc-400 mb-10 max-w-2xl leading-relaxed">
          A powerful REST API for fetching manga data, chapters, and images.
          Built with Next.js App Router, Cheerio, and cached for high
          performance.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center mb-20">
          {/* Primary Action Button */}
          <Link
            href="/api"
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-zinc-100 text-zinc-950 font-medium hover:bg-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            Check API
          </Link>

          {/* Secondary Action Buttons */}
          <Link
            href="/template"
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"></path>
              <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"></path>
            </svg>
            JSON to Template
          </Link>

          <a
            href="https://github.com/Wakype/komikcast-api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            GitHub
          </a>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
          {/* Feature 1 */}
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center mb-4 text-zinc-300 border border-zinc-700/50 group-hover:border-zinc-600 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                <path d="M3 12A9 3 0 0 0 21 12"></path>
              </svg>
            </div>
            <h3 className="text-zinc-100 font-medium mb-2">RESTful Design</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Clean and intuitive endpoints for listing manga, genres, and
              reading chapters.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center mb-4 text-zinc-300 border border-zinc-700/50 group-hover:border-zinc-600 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <h3 className="text-zinc-100 font-medium mb-2">High Performance</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Aggressive caching strategies to ensure fast response times and
              low server load.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center mb-4 text-zinc-300 border border-zinc-700/50 group-hover:border-zinc-600 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="text-zinc-100 font-medium mb-2">Strictly Typed</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Built with TypeScript for reliable data structures and developer
              experience.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Section */}
      <footer className="relative z-10 w-full border-t border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Author Credits */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 font-medium">
              Created by
            </span>
            <a
              href="https://github.com/Wakype"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-zinc-300 font-medium text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              waky.dev
            </a>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm text-zinc-500 font-medium">
            <Link
              href="/legal#terms"
              className="hover:text-zinc-300 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/legal#privacy"
              className="hover:text-zinc-300 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal#dmca"
              className="hover:text-zinc-300 transition-colors"
            >
              DMCA
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
