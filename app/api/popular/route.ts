import { NextRequest } from "next/server";
import { scrapePopular } from "@/libs/scrapePopular";
import { errWithLogs, okWithLogs } from "@/utils/response";
import { cacheHeader, CACHE_TTL, withCache } from "@/utils/cache";
import { runWithLogs } from "@/libs/scraper";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const take = Number.parseInt(searchParams.get("take") || "10", 10) || 10;
    const page = Number.parseInt(searchParams.get("page") || "1", 10) || 1;

    if (!category) {
      return errWithLogs(
        "Missing category parameter. Allowed: best-manhwa, best-manhua, best-manga, anime-adaptations, trending",
        [],
        400,
      );
    }

    const { data, logs } = await runWithLogs(() =>
      withCache(
        `popular:${category}:${take}:${page}`,
        CACHE_TTL.SHORT,
        () => scrapePopular(category, take, page),
      ),
    );

    return okWithLogs(data, logs, {
      headers: { "Cache-Control": cacheHeader(CACHE_TTL.SHORT) },
    });
  } catch (e: any) {
    console.error("[/api/popular]", e);
    return errWithLogs(e.message || "Failed to fetch popular komik", e?.logs ?? [], 500);
  }
}
