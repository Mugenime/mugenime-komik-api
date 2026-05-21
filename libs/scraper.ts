import * as cheerio from "cheerio";

const BASE_URL = process.env.MANGA_BASE_URL!;
const BYPASS_SECRET = process.env.BYPASS_SECRET;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

const PROXY_URLS: string[] = [
  process.env.SCRAPER_PROXY_URL,
  process.env.SCRAPER_PROXY_URL_2,
  process.env.SCRAPER_PROXY_URL_3,
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

async function rawFetch(path: string): Promise<Response> {
  const directUrl = getDirectUrl(path);

  // 1. ScraperAPI
  if (SCRAPER_API_KEY) {
    try {
      return await fetchViaScraperAPI(directUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[scraper] ScraperAPI failed for ${directUrl}: ${msg}. Falling back to proxy...`,
      );
    }
  }

  // 2. Custom proxy
  if (PROXY_URLS.length > 0) {
    const shuffled = [...PROXY_URLS].sort(() => Math.random() - 0.5);
    let lastError: Error | null = null;

    for (const proxyUrl of shuffled) {
      try {
        return await fetchViaProxy(proxyUrl, directUrl);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[scraper] Proxy ${proxyUrl} failed for ${directUrl}: ${lastError.message}. Trying next...`,
        );
      }
    }

    throw lastError ?? new Error(`All proxies failed for ${directUrl}`);
  }

  // 3. Direct fetch (local only)
  const response = await fetch(directUrl, {
    method: "GET",
    headers: defaultHeaders,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Direct fetch failed with status ${response.status} for ${directUrl}`,
    );
  }

  return response;
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
