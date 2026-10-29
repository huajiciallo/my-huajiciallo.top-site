/*
 * ====================================
 *   新闻详情页 V3（目录式 URL + 真实上一篇/下一篇）
 * ====================================
 *
 *   路由：/news/[category]/[slug]
 *   例：/news/industry/article-001
 *
 *   V3 重写：
 *     - URL 改目录式（SEO 友好：news → industry → article-001）
 *     - banner 沿用"新闻动态"4 字（栏目三原状）
 *     - 文章标题 h1 在 banner 下方
 *     - 上一篇/下一篇真实跳转：同分类下按 id 排序找前/后一篇
 *     - 返回按钮 router.push('/news?mode=overview&category=${category}')
 *     - 不建 /news/[category] 中间页（避免 /news 总页内容重复）
 *
 *   结构：server 顶层导出 generateStaticParams + dynamicParams
 *        + client inner 组件渲染交互（Suspense + useRouter）
 *
 *   Next.js 16：动态路由 params 变 Promise，必须 await 解开
 */

import ArticleDetailInner from "./ArticleDetailInner";
import data from "../../../../../content/news/data.json";
import fs from "node:fs";
import path from "node:path";

/*
 * 图集相册：构建时直接读文件夹里的图片，
 * 新图丢进目录就会自动出现在该条目的序号切换条里（不用改代码）。
 *
 *   gallery-aru-01 → public/images/bg/left + bg/right（背景图全集）
 *   article-006    → public/images/album/activity-01（活动01 自己的相册）
 */
const IMG_RE = /\.(webp|jpe?g|png|avif|gif)$/i;

function listDir(...segments: string[]): string[] {
  try {
    const dir = path.join(process.cwd(), "public", "images", ...segments);
    return fs
      .readdirSync(dir)
      .filter((f) => IMG_RE.test(f))
      .sort((a, b) => a.localeCompare(b, "en"))
      .map((f) => `/images/${segments.join("/")}/${f}`);
  } catch {
    return [];
  }
}

/** 每个条目用自己的相册目录；没配的条目只有封面一张 */
const ALBUMS: Record<string, string[]> = {
  "gallery-aru-01": [...listDir("bg", "left"), ...listDir("bg", "right")],
  "article-006": listDir("album", "activity-01"),
};

// ============ 静态生成所有 (category, slug) 组合 ============
export function generateStaticParams() {
  const items = (data as any).items || [];
  const params: { category: string; slug: string }[] = [];
  items.forEach((item: any) => {
    (item.articles || []).forEach((a: any) => {
      // 带 href 的条目直接指向独立页（例如工具 /tools/xxx.html），不生成详情页
      if (a.href) return;
      params.push({ category: item.slug, slug: a.id });
    });
  });
  return params;
}

// 不允许运行时动态参数（output: export 模式必须）
export const dynamicParams = false;

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  return (
    <ArticleDetailInner
      category={category}
      slug={slug}
      album={ALBUMS[slug] || []}
    />
  );
}
