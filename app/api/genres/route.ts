import { NextRequest } from "next/server";
import { err, okWithLogs } from "@/utils/response";
import { cacheHeader, CACHE_TTL, withCache } from "@/utils/cache";
import { scrapeGenres } from "@/libs/scrapeGenres";
import { runWithLogs } from "@/libs/scraper";

export async function GET(req: NextRequest) {
  try {
    const { data, logs } = await runWithLogs(() =>
      withCache("genres", CACHE_TTL.STATIC, () => scrapeGenres()),
    );

    return okWithLogs(data, logs, {
      // Genres rarely change, can be cached longer
      headers: { "Cache-Control": cacheHeader(CACHE_TTL.STATIC) },
    });
  } catch (e: any) {
    console.error("[/api/genres]", e);
    return err(e.message || "Failed to fetch genres");
  }
}
