import * as cheerio from "cheerio";
import { AsyncLocalStorage } from "node:async_hooks";

// ─── Per-request log store (AsyncLocalStorage) ────────────────────────────────
export type LogEntry = {
  level: "info" | "warn" | "error";
  strategy: string; // e.g. "ScraperAPI", "Proxy", "Direct", "DEDUP", "DONE", "FAILED"
  status: string; // e.g. "START", "OK 200", "FAIL", "SHARED"
  elapsed: number | null;
  path: string;
  extra?: string;
  ts: number; // Date.now() saat log dibuat
};

const logStorage = new AsyncLocalStorage<LogEntry[]>();

export function pushLog(entry: LogEntry) {
  logStorage.getStore()?.push(entry);
}

/** Ambil semua log yang dikumpulkan dalam request saat ini. */
export function getRequestLogs(): LogEntry[] {
  return logStorage.getStore() ?? [];
}

/**
 * Jalankan `fn` dalam konteks log baru (1 per request).
 * Mengembalikan { data, logs } — logs diambil sebelum store ditutup.
 */
export async function runWithLogs<T>(fn: () => Promise<T>): Promise<{ data: T; logs: LogEntry[] }> {
  const store: LogEntry[] = [];
  const data = await logStorage.run(store, fn);
  // Ambil salinan logs SEBELUM context ditutup
  return { data, logs: [...store] };
}

const BASE_URL = process.env.MANGA_BASE_URL!;
const BYPASS_SECRET = process.env.BYPASS_SECRET;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

const PROXY_URLS: string[] = [
  process.env.SCRAPER_PROXY_URL,
  process.env.SCRAPER_PROXY_URL_2,
  process.env.SCRAPER_PROXY_URL_3,
  process.env.SCRAPER_PROXY_URL_4,
].filter((url): url is string => typeof url === "string" && url.length > 0);

const defaultHeaders: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Ch-Ua":
    '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Referer: BASE_URL,
  Origin: BASE_URL.replace(/\/$/, ""),
};

// ─── ScraperAPI usage counter ─────────────────────────────────────────────────
// Per-instance counter — reset saat cold start, tapi cukup untuk deteksi lonjakan
let scraperApiCallCount = 0;

const SCRAPER_API_QUOTA = 5_000;
const SCRAPER_API_WARN_AT = 4_000; // warn di 80%

function trackScraperApiCall() {
  scraperApiCallCount++;

  if (scraperApiCallCount === SCRAPER_API_WARN_AT) {
    console.warn(
      `[scraper] ⚠️  ScraperAPI calls this instance hit ${scraperApiCallCount} — mendekati quota ${SCRAPER_API_QUOTA}/bulan. Pantau dashboard ScraperAPI.`,
    );
  }

  if (scraperApiCallCount % 500 === 0) {
    console.log(
      `[scraper] ScraperAPI calls this instance: ${scraperApiCallCount}`,
    );
  }
}

// ─── Fetch strategies ─────────────────────────────────────────────────────────
function getDirectUrl(path: string) {
  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function fetchViaScraperAPI(directUrl: string): Promise<Response> {
  const params = new URLSearchParams({
    api_key: SCRAPER_API_KEY!,
    url: directUrl,
    render: "false",
    country_code: "id",
  });

  const response = await fetch(
    `https://api.scraperapi.com?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "User-Agent": defaultHeaders["User-Agent"],
        Accept: defaultHeaders["Accept"],
        "Accept-Language": defaultHeaders["Accept-Language"],
        Referer: defaultHeaders["Referer"],
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `ScraperAPI failed with status ${response.status} for ${directUrl}`,
    );
  }

  trackScraperApiCall();
  return response;
}

async function fetchViaProxy(
  proxyUrl: string,
  directUrl: string,
): Promise<Response> {
  const url = `${proxyUrl.replace(/\/$/, "")}/?url=${encodeURIComponent(directUrl)}`;
  const headers: Record<string, string> = {};

  if (BYPASS_SECRET) {
    headers["X-Bypass-Key"] = BYPASS_SECRET;
  }

  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Proxy fetch failed with status ${response.status} for ${directUrl}`,
    );
  }

  return response;
}

// ─── In-flight deduplication ──────────────────────────────────────────────────
type FetchResult = { text: string; strategy: string; via?: string };
const inFlightRequests = new Map<string, Promise<FetchResult>>();

// ─── Logger helper ────────────────────────────────────────────────────────────
type Strategy = "ScraperAPI" | "Proxy" | "Direct" | "DEDUP";

const BADGE: Record<Strategy, string> = {
  ScraperAPI: "🟣 ScraperAPI",
  Proxy: "🔵 Proxy     ",
  Direct: "🟢 Direct    ",
  DEDUP: "🟡 DEDUP     ",
};

/** Ambil path + query dari URL penuh, potong jika terlalu panjang. */
function shortUrl(url: string): string {
  try {
    const { pathname, search } = new URL(url);
    const full = pathname + search;
    return full.length > 80 ? full.slice(0, 77) + "…" : full;
  } catch {
    return url.length > 80 ? url.slice(0, 77) + "…" : url;
  }
}

function logInfo(
  strategy: Strategy,
  status: string,
  elapsed: number,
  url: string,
  extra = "",
) {
  const ms = `+${elapsed}ms`.padStart(8);
  const extra_ = extra ? ` │ ${extra}` : "";
  console.log(
    `[scraper] ${BADGE[strategy]} │ ${status.padEnd(6)} │ ${ms} │ ${shortUrl(url)}${extra_}`,
  );
  pushLog({
    level: "info",
    strategy,
    status,
    elapsed,
    path: shortUrl(url),
    extra: extra || undefined,
    ts: Date.now(),
  });
}

function logWarn(
  strategy: Strategy,
  elapsed: number,
  url: string,
  reason: string,
) {
  const ms = `+${elapsed}ms`.padStart(8);
  console.warn(
    `[scraper] ${BADGE[strategy]} │ FAIL   │ ${ms} │ ${shortUrl(url)} → ${reason}`,
  );
  pushLog({
    level: "warn",
    strategy,
    status: "FAIL",
    elapsed,
    path: shortUrl(url),
    extra: reason,
    ts: Date.now(),
  });
}

async function rawFetch(path: string): Promise<Response> {
  const directUrl = getDirectUrl(path);
  const t0 = Date.now();

  // ── DEDUP: URL yang sama sedang in-flight, share hasilnya ─────────────────
  if (inFlightRequests.has(directUrl)) {
    const result = await inFlightRequests.get(directUrl)!;
    const elapsed = Date.now() - t0;
    console.log(
      `[scraper] ${BADGE["DEDUP"]} │ SHARED │ ${`+${elapsed}ms`.padStart(8)} │ ${shortUrl(directUrl)} (winner: ${result.strategy})`,
    );
    pushLog({
      level: "info",
      strategy: "DEDUP",
      status: "SHARED",
      elapsed,
      path: shortUrl(directUrl),
      extra: `winner: ${result.strategy}`,
      ts: Date.now(),
    });
    return new Response(result.text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── FETCH: jalankan semua strategy, return FetchResult ────────────────────
  const fetchPromise = (async (): Promise<FetchResult> => {
    let response: Response;

    // ── Strategy 1: ScraperAPI ──────────────────────────────────────────────
    if (SCRAPER_API_KEY) {
      const tS = Date.now();
      console.log(
        `[scraper] ${BADGE["ScraperAPI"]} │ START  │          │ ${shortUrl(directUrl)}`,
      );
      try {
        response = await fetchViaScraperAPI(directUrl);
        logInfo(
          "ScraperAPI",
          `OK ${response.status}`,
          Date.now() - tS,
          directUrl,
        );
        return { text: await response.text(), strategy: "ScraperAPI" };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWarn(
          "ScraperAPI",
          Date.now() - tS,
          directUrl,
          `${msg} -> fallback ke Proxy`,
        );
      }
    }

    // ── Strategy 2: Proxy (dicoba satu per satu, urutan acak) ──────────────
    if (PROXY_URLS.length > 0) {
      const shuffled = [...PROXY_URLS].sort(() => Math.random() - 0.5);
      let lastError: Error | null = null;

      for (const proxyUrl of shuffled) {
        const via = (() => {
          try {
            return new URL(proxyUrl).hostname;
          } catch {
            return proxyUrl;
          }
        })();
        const tS = Date.now();
        console.log(
          `[scraper] ${BADGE["Proxy"]} │ START  │          │ ${shortUrl(directUrl)} via ${via}`,
        );
        try {
          response = await fetchViaProxy(proxyUrl, directUrl);
          logInfo(
            "Proxy",
            `OK ${response.status}`,
            Date.now() - tS,
            directUrl,
            `via ${via}`,
          );
          return { text: await response.text(), strategy: "Proxy", via };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          logWarn(
            "Proxy",
            Date.now() - tS,
            directUrl,
            `via ${via}: ${lastError.message}`,
          );
        }
      }

      throw lastError ?? new Error(`All proxies failed for ${directUrl}`);
    }

    // ── Strategy 3: Direct (hanya dev / lokal) ─────────────────────────────
    const tS = Date.now();
    console.log(
      `[scraper] ${BADGE["Direct"]} │ START  │          │ ${shortUrl(directUrl)}`,
    );
    response = await fetch(directUrl, {
      method: "GET",
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (!response.ok) {
      logWarn("Direct", Date.now() - tS, directUrl, `HTTP ${response.status}`);
      throw new Error(
        `Direct fetch failed with status ${response.status} for ${directUrl}`,
      );
    }

    logInfo("Direct", `OK ${response.status}`, Date.now() - tS, directUrl);
    return { text: await response.text(), strategy: "Direct" };
  })();

  inFlightRequests.set(directUrl, fetchPromise);

  try {
    const result = await fetchPromise;
    const elapsed = Date.now() - t0;
    const via = result.via ? ` via ${result.via}` : "";
    console.log(
      `[scraper] ✅ DONE       │ ${`+${elapsed}ms`.padStart(8)} │ ${result.strategy}${via} │ ${shortUrl(directUrl)}`,
    );
    pushLog({
      level: "info",
      strategy: "DONE",
      status: "OK",
      elapsed,
      path: shortUrl(directUrl),
      extra: `via ${result.strategy}${result.via ? ` (${result.via})` : ""}`,
      ts: Date.now(),
    });
    return new Response(result.text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const elapsed = Date.now() - t0;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[scraper] ❌ FAILED     │ ${`+${elapsed}ms`.padStart(8)} │ ${shortUrl(directUrl)} │ ${errMsg}`,
    );
    pushLog({
      level: "error",
      strategy: "FAILED",
      status: "FAIL",
      elapsed,
      path: shortUrl(directUrl),
      extra: errMsg,
      ts: Date.now(),
    });
    throw err;
  } finally {
    inFlightRequests.delete(directUrl);
  }
}

// ─── Fetch API ───────────────────────────────────────────────────────────────
export async function fetchAPI(path: string) {
  const response = await rawFetch(path);
  return response.json();
}

// unused function
export async function fetchPage(path: string) {
  const response = await rawFetch(path);
  const html = await response.text();
  return cheerio.load(html);
}
