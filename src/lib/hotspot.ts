/*
 * ====================================
 *   热点共享算法模块（栏目3 PageContent + 首页 MonthlyMagazine 共用）
 * ====================================
 *   数据源：content/news/data.json 的 items 数组（唯一定义处）
 *   能力：
 *     1. flattenArticles —— 扁平化 + 字段防御（items/articles 缺失或非数组时返回空）
 *                          + 日期规范化（"2026-6-5" 补零为 "2026-06-05"，防止月份分组分裂）
 *     2. groupByMonth    —— 按 "YYYY-MM" 分组，月份倒序
 *     3. sortMonthArticles —— 单月内排序：featured 优先，viewCount 降序
 *   规则改动只改这里，栏目3与首页自动同步。
 */

export interface HotspotArticle {
  id: string;
  title: string;
  summary: string;
  image?: string;
  date: string;
  tag: string;
  viewCount: number;
  featured?: boolean;
  categorySlug: string;
  categoryName: string;
  [key: string]: unknown;
}

/** 日期规范化：容忍 "2026-6-5" / "2026-06-5" 等未补零写法，统一为 "YYYY-MM-DD"；无法解析时原样返回 */
export function normalizeDate(date: string): string {
  if (!date || typeof date !== "string") return "";
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(date.trim());
  if (!m) return date;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/**
 * 扁平化 data.json 的 items 为带元信息的文章数组。
 * 字段防御：items / articles 缺失、null、非数组时安全返回已收集部分（最终可能为空数组）。
 */
export function flattenArticles(items: unknown): HotspotArticle[] {
  const out: HotspotArticle[] = [];
  if (!Array.isArray(items)) return out;
  items.forEach((item: any) => {
    if (!item) return;
    const articles = Array.isArray(item.articles) ? item.articles : [];
    articles.forEach((a: any) => {
      if (!a || !a.id) return;
      out.push({
        ...a,
        date: normalizeDate(a.date),
        viewCount: typeof a.viewCount === "number" ? a.viewCount : 0,
        featured: a.featured === true,
        categorySlug: item.slug || "",
        categoryName: item.shortTitle || "",
      });
    });
  });
  return out;
}

/** 按 "YYYY-MM" 分组（取规范化后 date 前 7 位），返回 [ym, articles][]，月份倒序 */
export function groupByMonth(articles: HotspotArticle[]): Array<[string, HotspotArticle[]]> {
  const monthMap = new Map<string, HotspotArticle[]>();
  articles.forEach((a) => {
    const ym = (a.date || "").substring(0, 7);
    if (!ym) return;
    if (!monthMap.has(ym)) monthMap.set(ym, []);
    monthMap.get(ym)!.push(a);
  });
  return Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

/** 单月排序：featured 优先，其次 viewCount 降序（不改变原数组） */
export function sortMonthArticles(articles: HotspotArticle[]): HotspotArticle[] {
  return [...articles].sort((a, b) => {
    const bf = b.featured ? 1 : 0;
    const af = a.featured ? 1 : 0;
    if (bf !== af) return bf - af;
    return b.viewCount - a.viewCount;
  });
}
