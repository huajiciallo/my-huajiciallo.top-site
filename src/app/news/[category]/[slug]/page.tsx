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
  return <ArticleDetailInner category={category} slug={slug} />;
}
