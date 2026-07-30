import { AsyncLocalStorage } from "node:async_hooks";

// ─── Per-request log store (AsyncLocalStorage) ────────────────────────────────
export type LogEntry = {
  level: "info" | "warn" | "error";
  strategy: string; // e.g. "ScraperAPI", "Proxy", "Direct", "DEDUP", "CACHE", "DONE", "FAILED"
  status: string; // e.g. "START", "OK 200", "FAIL", "SHARED", "HIT", "MISS"
  elapsed: number | null;
  path: string;
  extra?: string;
  ts: number; // Date.now() saat log dibuat
};

export type Strategy = "ScraperAPI" | "Proxy" | "Direct" | "DEDUP" | "CACHE";

const BADGE: Record<Strategy, string> = {
  ScraperAPI: "🟣 ScraperAPI",
  Proxy: "🔵 Proxy     ",
  Direct: "🟢 Direct    ",
  DEDUP: "🟡 DEDUP     ",
  CACHE: "⚡ CACHE     ",
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
export async function runWithLogs<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; logs: LogEntry[] }> {
  const store: LogEntry[] = [];
  try {
    const data = await logStorage.run(store, fn);
    return { data, logs: [...store] };
  } catch (err) {
    if (err && typeof err === "object") {
      (err as any).logs = [...store];
    }
    throw err;
  }
}

/** Ambil path + query dari URL penuh, potong jika terlalu panjang. */
export function shortUrl(url: string): string {
  try {
    const { pathname, search } = new URL(url);
    const full = pathname + search;
    return full.length > 80 ? full.slice(0, 77) + "…" : full;
  } catch {
    return url.length > 80 ? url.slice(0, 77) + "…" : url;
  }
}

// ─── Logging Helpers ──────────────────────────────────────────────────────────

export function logStart(strategy: Strategy, url: string, extra = "") {
  const extra_ = extra ? ` via ${extra}` : "";
  console.log(
    `[scraper] ${BADGE[strategy]} │ START  │          │ ${shortUrl(url)}${extra_}`,
  );
}

export function logInfo(
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

export function logWarn(
  strategy: Strategy,
  elapsed: number,
  url: string,
  reason: string,
) {
  const ms = `+${elapsed}ms`.padStart(8);
  console.warn(
    `[scraper] ${BADGE[strategy]} │ FAIL   │ ${ms} │ ${shortUrl(url)} -> ${reason}`,
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

export function logDone(
  strategy: string,
  elapsed: number,
  url: string,
  via?: string,
) {
  const ms = `+${elapsed}ms`.padStart(8);
  const via_ = via ? ` via ${via}` : "";
  console.log(
    `[scraper] ✅ DONE       │ ${ms} │ ${strategy}${via_} │ ${shortUrl(url)}`,
  );
  pushLog({
    level: "info",
    strategy: "DONE",
    status: "OK",
    elapsed,
    path: shortUrl(url),
    extra: `via ${strategy}${via ? ` (${via})` : ""}`,
    ts: Date.now(),
  });
}

export function logError(
  strategy: string,
  elapsed: number,
  url: string,
  errMsg: string,
) {
  const ms = `+${elapsed}ms`.padStart(8);
  console.error(
    `[scraper] ❌ FAILED     │ ${ms} │ ${shortUrl(url)} │ ${errMsg}`,
  );
  pushLog({
    level: "error",
    strategy: "FAILED",
    status: "FAIL",
    elapsed,
    path: shortUrl(url),
    extra: errMsg,
    ts: Date.now(),
  });
}

// ─── ScraperAPI usage counter ─────────────────────────────────────────────────
let scraperApiCallCount = 0;
const SCRAPER_API_QUOTA = 5_000;
const SCRAPER_API_WARN_AT = 4_000;

export function trackScraperApiCall() {
  scraperApiCallCount++;

  if (scraperApiCallCount === SCRAPER_API_WARN_AT) {
    console.warn(
      `[scraper] ⚠️ ScraperAPI calls hit ${scraperApiCallCount} — mendekati quota ${SCRAPER_API_QUOTA}/bulan.`,
    );
  }

  if (scraperApiCallCount % 500 === 0) {
    console.log(
      `[scraper] ScraperAPI calls this instance: ${scraperApiCallCount}`,
    );
  }
}
