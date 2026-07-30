import { NextRequest } from "next/server";
import { errWithLogs, okWithLogs } from "@/utils/response";
import { cacheHeader, CACHE_TTL, withCache } from "@/utils/cache";
import { scrapeAdvanceSearch } from "@/libs/scrapeAdvanceSearch";
import { runWithLogs } from "@/libs/scraper";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { data, logs } = await runWithLogs(() =>
      withCache(
        `advanceSearch:${[...searchParams.entries()].sort().toString()}`,
        CACHE_TTL.SHORT,
        () => scrapeAdvanceSearch(searchParams),
      ),
    );

    return okWithLogs(data, logs, {
      headers: { "Cache-Control": cacheHeader(CACHE_TTL.SHORT) },
    });
  } catch (e: any) {
    console.error("[/api/advanceSearch]", e);
    return errWithLogs(e.message || "Failed to fetch advance search komik", e?.logs ?? [], 500);
  }
}
