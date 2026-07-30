import { NextRequest } from "next/server";
import { errWithLogs, okWithLogs } from "@/utils/response";
import { cacheHeader, CACHE_TTL, withCache } from "@/utils/cache";
import { scrapeGenres } from "@/libs/scrapeGenres";
import { runWithLogs } from "@/libs/scraper";

export async function GET(req: NextRequest) {
  try {
    const { data, logs } = await runWithLogs(() =>
      withCache("genres", CACHE_TTL.STATIC, () => scrapeGenres()),
    );

    return okWithLogs(data, logs, {
      headers: { "Cache-Control": cacheHeader(CACHE_TTL.STATIC) },
    });
  } catch (e: any) {
    console.error("[/api/genres]", e);
    return errWithLogs(e.message || "Failed to fetch genres", e?.logs ?? [], 500);
  }
}
