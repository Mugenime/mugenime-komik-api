import { fetchAPI } from "@/libs/scraper";
import { 
  ReadChapterContent,
  KomikcastChapterContentResponse,
  KomikcastReadChapterResponse
} from "@/types/manga";

/**
 * Format slug menjadi judul yang readable.
 * Contoh: "on-the-way-to-see-mom" → "On The Way To See Mom"
 * Dipakai sebagai fallback bila komikTitle tidak tersedia dari cache.
 */
function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function scrapeReadChapter(slug: string, chapterId: string, baseUrl: string) {
  // ✅ FIX: Hanya 2 fetch, bukan 3.
  // Detail komik (/series/${slug}?includeMeta=true) DIHAPUS dari sini karena:
  //   1. Data itu sudah tersedia di endpoint /api/komik/[slug] yang harus dipanggil lebih dulu.
  //   2. Memanggil detail komik di setiap chapter request = over-fetching besar-besaran
  //      (bayangkan 30 chapter × 1 extra proxy call = 30 request sia-sia per halaman baca).
  const [contentRes, chapListRes] = await Promise.all([
    fetchAPI(`/series/${slug}/chapters/${chapterId}`) as Promise<KomikcastChapterContentResponse>,
    fetchAPI(`/series/${slug}/chapters`) as Promise<KomikcastReadChapterResponse>
  ]);

  const chapterData = contentRes.data;
  if (!chapterData) {
    throw new Error("Chapter not found");
  }

  const chapters = chapListRes.data || [];

  const sortedChapters = [...chapters].sort((a, b) => a.data.index - b.data.index);
  
  const currentIndex = sortedChapters.findIndex((ch) => ch.data.index.toString() === chapterId);
  let prevChapterId: number | null = null;
  let nextChapterId: number | null = null;

  if (currentIndex !== -1) {
    if (currentIndex > 0) {
      prevChapterId = sortedChapters[currentIndex - 1].data.index;
    }
    if (currentIndex < sortedChapters.length - 1) {
      nextChapterId = sortedChapters[currentIndex + 1].data.index;
    }
  }

  const chapterList = sortedChapters.map((ch) => ({
    id: ch.id,
    chapterIndex: ch.data.index,
    slug: ch.data.slug,
    title: ch.data.title,
    createdAt: ch.createdAt,
    updatedAt: ch.updatedAt,
  }));

  const result: ReadChapterContent = {
    id: chapterData.id,
    chapterIndex: chapterData.chapterIndex,
    // komikTitle didapatkan dari slug (sudah cukup untuk navigasi).
    // Bila consumer butuh judul asli, gunakan data dari GET /api/komik/[slug] yang di-cache.
    komikTitle: slugToTitle(slug),
    komikSlug: slug,
    images: (chapterData.data.images || []).map(
      (img) => `${baseUrl}/api/proxy?url=${encodeURIComponent(img)}`
    ),
    createdAt: chapterData.createdAt,
    updatedAt: chapterData.updatedAt,
    prevChapterId,
    nextChapterId,
    chapterList,
  };

  return result;
}
