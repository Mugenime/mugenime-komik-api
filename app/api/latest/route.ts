import { NextRequest } from "next/server";
import { errWithLogs, okWithLogs } from "@/utils/response";
import { cacheHeader, CACHE_TTL, withCache } from "@/utils/cache";
import { scrapeLatest } from "@/libs/scrapeLatest";
import { runWithLogs } from "@/libs/scraper";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get("page") || "1", 10) || 1;

    const { data, logs } = await runWithLogs(() =>
      withCache(`latest:${page}`, CACHE_TTL.SHORT, () => scrapeLatest(page)),
    );

    return okWithLogs(data, logs, {
      headers: { "Cache-Control": cacheHeader(CACHE_TTL.SHORT) },
    });
  } catch (e: any) {
    console.error("[/api/latest]", e);
    return errWithLogs(e.message || "Failed to fetch latest komik", e?.logs ?? [], 500);
  }
}
