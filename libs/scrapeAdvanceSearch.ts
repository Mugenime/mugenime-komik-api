import { fetchAPI } from "@/libs/scraper";
import {
  FilterKomik,
  KomikcastFilterResponse,
  PaginatedResponse,
} from "@/types/manga";

export async function scrapeAdvanceSearch(
  searchParams: URLSearchParams,
): Promise<PaginatedResponse<FilterKomik>> {
  const params = new URLSearchParams(searchParams.toString());

  // Transformation for search / title / q
  const search = params.get("search") || params.get("title") || params.get("q");
  if (search) {
    params.set("title", search);
    params.delete("search");
    params.delete("q");
  }

  // Transformation for genreIds, status, format, type
  const arrayParams = ["genreIds", "status", "format", "type"];
  arrayParams.forEach((key) => {
    const vals = params.getAll(key);
    if (vals.length > 0) {
      params.delete(key);
      vals.forEach((val) => {
        val.split(",").forEach((v) => {
          const trimmed = v.trim();
          if (trimmed) params.append(key, trimmed);
        });
      });
    }
  });

  // Add default parameters if not provided
  if (!params.has("takeChapter")) params.set("takeChapter", "1");
  if (!params.has("includeMeta")) params.set("includeMeta", "true");
  if (!params.has("sort")) params.set("sort", "latest");
  if (!params.has("sortOrder")) params.set("sortOrder", "desc");
  if (!params.has("take")) params.set("take", "12");
  if (!params.has("page")) params.set("page", "1");

  const queryParams = params.toString();
  const res: KomikcastFilterResponse = await fetchAPI(`/series?${queryParams}`);

  if (!res.data || !Array.isArray(res.data)) {
    throw new Error("Failed to fetch filter komik");
  }

  const data: FilterKomik[] = res.data.map((item) => ({
    title: item.data.title,
    nativeTitle: item.data.nativeTitle || "",
    slug: item.data.slug,
    synopsis: item.data.synopsis,
    cover: item.data.coverImage,
    backgroundImage: item.data.backgroundImage || "",
    rating: item.data.rating?.toString() || "0",
    type: item.data.type || "",
    isHot: item.data.isHot,
    isRecommended: item.data.isRecommended,
    author: item.data.author || "",
    format: item.data.format || "",
    releaseDate: item.data.releaseDate || "",
    status: item.data.status || "",
    totalChapters: item.data.totalChapters || "0",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    chapters: (item.chapters || []).map((ch) => ({
      chapterIndex: ch.chapterIndex || 0,
      updatedAt: ch.updatedAt,
      createdAt: ch.createdAt,
    })),
    genres: item.data.genres || [],
  }));

  const page = res.meta?.page || 1;
  const lastPage = res.meta?.lastPage || 1;
  const meta = res.meta || {
    total: data.length,
    page: page,
    lastPage: 1,
  };

  return {
    page,
    hasNextPage: page < lastPage,
    meta,
    data,
  };
}
