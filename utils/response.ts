import { LogEntry } from "@/libs/scraperLog";

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ status: "ok", data }, init);
}

export function err(message: string, status = 500) {
  return Response.json({ status: "error", message }, { status });
}

/**
 * Same as ok(), but also attaches scraper logs as `X-Scraper-Logs` response header.
 * Logs must be passed explicitly (captured from runWithLogs return value).
 */
export function okWithLogs<T>(data: T, logs: LogEntry[], init?: ResponseInit): Response {
  const jsonStr = JSON.stringify(logs);
  const logsHeader = Buffer.from(jsonStr, "utf-8").toString("base64");

  const existingHeaders = new Headers((init as any)?.headers ?? {});
  existingHeaders.set("X-Scraper-Logs", logsHeader);
  existingHeaders.set("Access-Control-Expose-Headers", "X-Scraper-Logs");

  return Response.json(
    { status: "ok", data },
    { ...init, headers: existingHeaders },
  );
}

/**
 * Same as err(), but also attaches scraper logs as `X-Scraper-Logs` response header.
 * Ensures log panel displays events even when all scraping strategies fail.
 */
export function errWithLogs(
  message: string,
  logs: LogEntry[] = [],
  status = 500,
  init?: ResponseInit,
): Response {
  const jsonStr = JSON.stringify(logs);
  const logsHeader = Buffer.from(jsonStr, "utf-8").toString("base64");

  const existingHeaders = new Headers((init as any)?.headers ?? {});
  existingHeaders.set("X-Scraper-Logs", logsHeader);
  existingHeaders.set("Access-Control-Expose-Headers", "X-Scraper-Logs");

  return Response.json(
    { status: "error", message },
    { ...init, status, headers: existingHeaders },
  );
}
