import { NextRequest } from "next/server";
import { err, okWithLogs } from "@/utils/response";
import { cacheHeader, CACHE_TTL, withCache } from "@/utils/cache";
import { scrapeHome } from "@/libs/scrapeHome";
import { runWithLogs } from "@/libs/scraper";

export async function GET(req: NextRequest) {
  try {
    const { data, logs } = await runWithLogs(() =>
      withCache("home", CACHE_TTL.SHORT, () => scrapeHome()),
    );

    return okWithLogs(data, logs, {
      headers: { "Cache-Control": cacheHeader(CACHE_TTL.SHORT) },
    });
  } catch (e) {
    console.error("[/api/home]", e);
    return err("Failed to fetch home data");
  }
}
