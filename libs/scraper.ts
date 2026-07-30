import * as cheerio from "cheerio";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import {
  shortUrl,
  logStart,
  logInfo,
  logWarn,
  logDone,
  logError,
  pushLog,
  trackScraperApiCall,
} from "./scraperLog";

export type { LogEntry } from "./scraperLog";
export { pushLog, getRequestLogs, runWithLogs } from "./scraperLog";

// ─── Environment Configuration ────────────────────────────────────────────────
const BASE_URL = process.env.MANGA_BASE_URL!;
const BYPASS_SECRET = process.env.BYPASS_SECRET;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

/** URL Custom Proxy (Cloudflare Workers / Deno / Netlify) */
const PROXY_URLS: string[] = Object.keys(process.env)
  .filter((key) => key.startsWith("SCRAPER_PROXY_URL"))
  .map((key) => process.env[key])
  .filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0,
  );

/** URL Webshare HTTP Proxy (http://username:password@ip:port) */
const WEBSHARE_PROXIES: string[] = Object.keys(process.env)
  .filter((key) => key.startsWith("WEBSHARE_PROXY"))
  .map((key) => process.env[key])
  .filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0,
  );

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
  Referer: BASE_URL,
  Origin: BASE_URL.replace(/\/$/, ""),
};

// ─── SCRAPING QUEUE ────────────────────────────────────────
export type ScraperStrategyName =
  | "WebshareProxy"
  | "CustomProxy"
  | "ScraperAPI"
  | "DirectFetch";

export const SCRAPER_STRATEGY_QUEUE: ScraperStrategyName[] = [
  "WebshareProxy",
  "CustomProxy",
  "ScraperAPI",
  "DirectFetch",
];

// ─── Helper Functions ─────────────────────────────────────────────────────────
function getDirectUrl(path: string) {
  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// ─── Low-Level Fetchers ───────────────────────────────────────────────────────

/** ScraperAPI fetcher */
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

/** Custom Proxy fetcher (Cloudflare / Deno / Netlify) */
async function fetchViaCustomProxy(
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

/** Webshare HTTP Proxy fetcher (undici ProxyAgent) */
async function fetchViaWebshareProxy(
  proxyUrl: string,
  directUrl: string,
): Promise<Response> {
  const agent = new ProxyAgent(proxyUrl);

  const response = await undiciFetch(directUrl, {
    method: "GET",
    headers: defaultHeaders,
    dispatcher: agent,
  });

  if (!response.ok) {
    throw new Error(
      `Webshare Proxy failed with status ${response.status} for ${directUrl}`,
    );
  }

  return response as unknown as Response;
}

// ─── Strategy Runner Functions ────────────────────────────────────────────────
type FetchResult = { text: string; strategy: string; via?: string };

async function runScraperAPI(directUrl: string): Promise<FetchResult | null> {
  if (!SCRAPER_API_KEY) return null;

  const tS = Date.now();
  logStart("ScraperAPI", directUrl);
  try {
    const response = await fetchViaScraperAPI(directUrl);
    logInfo("ScraperAPI", `OK ${response.status}`, Date.now() - tS, directUrl);
    return { text: await response.text(), strategy: "ScraperAPI" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logWarn("ScraperAPI", Date.now() - tS, directUrl, `${msg} -> fallback`);
    return null;
  }
}

async function runWebshareProxy(
  directUrl: string,
): Promise<FetchResult | null> {
  if (WEBSHARE_PROXIES.length === 0) return null;

  const shuffled = [...WEBSHARE_PROXIES].sort(() => Math.random() - 0.5);
  for (const proxyUrl of shuffled) {
    const tS = Date.now();
    const proxyLabel = (() => {
      try {
        return new URL(proxyUrl).hostname;
      } catch {
        return "Webshare";
      }
    })();
    logStart("Proxy", directUrl, `Webshare (${proxyLabel})`);
    try {
      const response = await fetchViaWebshareProxy(proxyUrl, directUrl);
      logInfo(
        "Proxy",
        `OK ${response.status}`,
        Date.now() - tS,
        directUrl,
        `via Webshare (${proxyLabel})`,
      );
      return {
        text: await response.text(),
        strategy: "Proxy",
        via: `Webshare (${proxyLabel})`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logWarn(
        "Proxy",
        Date.now() - tS,
        directUrl,
        `via Webshare (${proxyLabel}): ${msg}`,
      );
    }
  }
  return null;
}

async function runCustomProxy(directUrl: string): Promise<FetchResult | null> {
  if (PROXY_URLS.length === 0) return null;

  const shuffled = [...PROXY_URLS].sort(() => Math.random() - 0.5);
  for (const proxyUrl of shuffled) {
    const via = (() => {
      try {
        return new URL(proxyUrl).hostname;
      } catch {
        return proxyUrl;
      }
    })();
    const tS = Date.now();
    logStart("Proxy", directUrl, via);
    try {
      const response = await fetchViaCustomProxy(proxyUrl, directUrl);
      logInfo(
        "Proxy",
        `OK ${response.status}`,
        Date.now() - tS,
        directUrl,
        `via ${via}`,
      );
      return { text: await response.text(), strategy: "Proxy", via };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logWarn("Proxy", Date.now() - tS, directUrl, `via ${via}: ${msg}`);
    }
  }

  console.warn(
    `[scraper] ⚠️ Semua proxy custom (${shuffled.length}) gagal untuk ${shortUrl(directUrl)}.`,
  );
  return null;
}

async function runDirectFetch(directUrl: string): Promise<FetchResult | null> {
  const tS = Date.now();
  logStart("Direct", directUrl);
  try {
    const response = await fetch(directUrl, {
      method: "GET",
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (!response.ok) {
      logWarn("Direct", Date.now() - tS, directUrl, `HTTP ${response.status}`);
      return null;
    }

    logInfo("Direct", `OK ${response.status}`, Date.now() - tS, directUrl);
    return { text: await response.text(), strategy: "Direct" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logWarn("Direct", Date.now() - tS, directUrl, msg);
    return null;
  }
}

// ─── In-Flight Request Deduplication & Main Pipeline ──────────────────────────
const inFlightRequests = new Map<string, Promise<FetchResult>>();

async function rawFetch(path: string): Promise<Response> {
  const directUrl = getDirectUrl(path);
  const t0 = Date.now();

  // ── DEDUP: request URL yang sama sedang berjalan, share hasilnya ─────────────
  if (inFlightRequests.has(directUrl)) {
    const result = await inFlightRequests.get(directUrl)!;
    const elapsed = Date.now() - t0;
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

  const fetchPromise = (async (): Promise<FetchResult> => {
    for (const strategyName of SCRAPER_STRATEGY_QUEUE) {
      let result: FetchResult | null = null;

      switch (strategyName) {
        case "WebshareProxy":
          result = await runWebshareProxy(directUrl);
          break;
        case "CustomProxy":
          result = await runCustomProxy(directUrl);
          break;
        case "ScraperAPI":
          result = await runScraperAPI(directUrl);
          break;
        case "DirectFetch":
          result = await runDirectFetch(directUrl);
          break;
      }

      if (result) {
        return result;
      }
    }

    throw new Error(
      `All scraping strategies in queue (${SCRAPER_STRATEGY_QUEUE.join(", ")}) failed for ${directUrl}`,
    );
  })();

  inFlightRequests.set(directUrl, fetchPromise);

  try {
    const result = await fetchPromise;
    const elapsed = Date.now() - t0;
    logDone(result.strategy, elapsed, directUrl, result.via);
    return new Response(result.text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const elapsed = Date.now() - t0;
    const errMsg = err instanceof Error ? err.message : String(err);
    logError("FAILED", elapsed, directUrl, errMsg);
    throw err;
  } finally {
    inFlightRequests.delete(directUrl);
  }
}

// ─── Exported Fetch Functions ────────────────────────────────────────────────
export async function fetchAPI(path: string) {
  const response = await rawFetch(path);
  return response.json();
}

export async function fetchPage(path: string) {
  const response = await rawFetch(path);
  const html = await response.text();
  return cheerio.load(html);
}
