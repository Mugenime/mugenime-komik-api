import { NextRequest } from "next/server";
import { errWithLogs, okWithLogs } from "@/utils/response";
import { cacheHeader, CACHE_TTL, withCache } from "@/utils/cache";
import { scrapeDetailKomik } from "@/libs/scrapeDetailKomik";
import { runWithLogs } from "@/libs/scraper";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { data, logs } = await runWithLogs(() =>
      withCache(`komik:${slug}`, CACHE_TTL.MEDIUM, () =>
        scrapeDetailKomik(slug),
      ),
    );

    return okWithLogs(data, logs, {
      headers: { "Cache-Control": cacheHeader(CACHE_TTL.MEDIUM) },
    });
  } catch (e: any) {
    console.error("[/api/komik/[slug]]", e);
    return errWithLogs(e.message || "Failed to fetch komik detail", e?.logs ?? [], 500);
  }
}
