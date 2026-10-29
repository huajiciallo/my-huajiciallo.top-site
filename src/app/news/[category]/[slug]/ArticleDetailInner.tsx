'use client';

/*
 * 详情页 V3 客户端 inner 组件
 * - 接收 server 顶层传过来的 category/slug
 * - 找文章 + 同分类前/后一篇
 * - 渲染 banner + 文章 + 上一篇/下一篇 + 返回 + 相关推荐
 */

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import data from "../../../../../content/news/data.json";
import { parseArticleContent } from "../../../../lib/parseArticleContent";
import GalleryDetail from "./GalleryDetail";
import ViewCount from "../../../components/ViewCount";

const CATEGORY_NAMES: Record<string, string> = {
  industry: "图集",
  company: "在线工具",
  "red-theme": "资源",
};

// 找文章 + 同分类前/后
function findArticleWithNav(category: string, slug: string) {
  const items = (data as any).items || [];
  const cat = items.find((it: any) => it.slug === category);
  if (!cat) return { article: null, prev: null, next: null, related: [] };

  // 同分类下按 id 排序（id 数字递增 = 越后越新）
  // 带 href 的条目（工具页等）没有详情页，不能出现在上一篇/下一篇里
  const sorted = cat.articles
    .filter((a: any) => !a.href)
    .sort((a: any, b: any) => a.id.localeCompare(b.id));
  const idx = sorted.findIndex((a: any) => a.id === slug);
  if (idx < 0) return { article: null, prev: null, next: null, related: [] };

  const article = sorted[idx];
  // 上一篇 = idx-1（更早的 id），下一篇 = idx+1（更晚的 id）
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  // 相关推荐 = 同分类其他文章（最多 3 条）
  const related = sorted.filter((_: any, i: number) => i !== idx).slice(0, 3);

  return { article, prev, next, related };
}

// V29：content 字段实装 —— 支持 ##/### 标题、• 列表、[图N] 图片引用（连续多个自动 2/3 列并排）+ 短行图说
// V40.2：函数体已抽离到 @/lib/parseArticleContent，本地定义保留作历史参考（dead code）
// V40.2：content 渲染器已抽离到 @/lib/parseArticleContent（共用于 news + cases）

const PLACEHOLDER_ARTICLE = {
  id: "article-001",
  title: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  date: "2026-07-03",
  categorySlug: "industry",
  categoryName: "行业资讯",
  tag: "占位",
  author: { name: "亚瑠啦啦队", role: "记录" },
  readTime: 1,
  summary: "",
  tags: ["占位", "样式参考", "AAAA", "BBBB", "测试"],
  images: [],
  content: [
    "这是一篇占位文章，用于测试详情页 V3 的排版与跳转。",
    "5 个 id (article-001 ~ article-005) 共享同一份占位内容，节省积分消耗。",
    "时间统一 2026-07-03，分类分散到 4 个栏目（industry 1 / company 1 / red-theme 1 / other 2），用于测试：",
    "• 栏目合并形成版式\n• 总览页底部分页跳转\n• 详情页路由携带 category/slug 参数",
    "如有任何显示异常或排版问题，请截图反馈。",
    "",
    "【后续添加内容指南】",
    "",
    "1. 现有栏目加新文章：编辑 content/news/data.json，在对应 items[].articles[] 追加一条。必填字段：id (article-017 递增格式，全局唯一) / date (YYYY-MM-DD) / viewCount / tag / title / summary / image / images[]。",
    "image 用作横条缩略图，images[] 用作详情页大图（多图传多个对象，单图传 1 个，不要图就 []）。",
    "",
    "2. 添加新栏目：要改 3 处：\n• data.json 末尾追加新 items 块（含 slug / shortTitle / title / subtitle / articles）\n• ArticleDetailInner.tsx 的 CATEGORY_NAMES 加新分类名\n• 跑 npx next build",
    "",
    "3. 修改/删除：直接改 data.json，删文章从 articles[] 数组里移除对象。上一篇/下一篇按 id 排序自动跳过被删的。注意不要删占位 5 篇（article-001~005），共享占位内容用，删了详情页会找不到。",
    "",
    "4. build 必要：output:export 静态导出，不 build 新文章不生效。dev server 已起时改 data.json 浏览器刷新即可（热更新）；生产环境必须 npx next build，输出 out/ 目录部署。",
    "",
    "5. 容易踩的坑：\n• JSON 语法：最后一项不要有逗号\n• id 唯一：重复会导致路由冲突\n• 图片路径：用 /images/xxx.jpg（前导斜杠），文件放 public/images/ 下\n• 横条/热点版式：V23.3 设计的 15 条/页分页 + 顶部筛选对新文章自动生效",
  ],
  source: "活动记录",
};

interface InnerProps {
  category: string;
  slug: string;
  /** 图集相册：构建时从 public/images/bg 读出来的全部图片 */
  album?: string[];
}

export default function ArticleDetailInner({ category, slug, album = [] }: InnerProps) {
  const router = useRouter();

  const { article: realArticle, prev, next, related } = findArticleWithNav(category, slug);

  // 5 个占位 id 用同一份占位内容
  const isPlaceholder = /^article-00[1-5]$/.test(slug);
  const article = isPlaceholder || !realArticle
    ? {
        ...PLACEHOLDER_ARTICLE,
        categorySlug: category,
        categoryName: CATEGORY_NAMES[category] || "占位栏目",
      }
    : realArticle;

  // 分类名：data.json 里的 articles 不带 categoryName（原页面这里一直是空字符串），这里补上
  const categoryName =
    CATEGORY_NAMES[category] ||
    (data as any).items?.find((i: any) => i.slug === category)?.shortTitle ||
    "资讯";

  // V3b：返回按钮
  // 优先用 sessionStorage 记录的来源页 URL（PageContent 横条点击时存的）
  // 没有则 push 兜底（直接通过 URL 进详情页的情况）
  const handleBack = () => {
    if (typeof window === "undefined") return;
    const backUrl = sessionStorage.getItem("news_back_url");
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.push(`/?mode=overview&category=${category}`);
    }
  };

  // 图集（industry）：左图 + 右侧提示词，单独一套版式
  if (category === "industry") {
    return (
      <GalleryDetail
        article={article}
        categoryName={categoryName}
        category={category}
        album={album}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* ============ Hero banner - V25：293px（扩 1/3）+ 只留 title ============ */}
      {/* V28a：banner 移到 grid 容器外，100% 全屏宽（之前被压在 1088px 容器里显得压扁） */}
      <section className="relative h-[240px] overflow-hidden bg-[#14110c]">
        <div className="absolute inset-0">
          {/* banner 优先用这篇文章自己的主图，没有才回落到栏目底图；压暗成"页眉带"，避免和正文大图重复观感 */}
          <img
            src={article.image || (data as any).banner?.background || "/images/banner-news.webp"}
            alt=""
            className="w-full h-full object-cover"
            onError={(e: any) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-[#070b12]/60" />
        </div>

        {/* banner 左上角：两个返回入口（不再需要顶部导航栏） */}
        <div className="absolute left-5 top-5 z-10 flex flex-wrap items-center gap-2 md:left-8 md:top-7">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] text-white/85 backdrop-blur-sm transition-colors hover:bg-white hover:text-[#14110c]"
          >
            ← 返回首页
          </Link>
          <Link
            href="/?view=list"
            className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] text-white/85 backdrop-blur-sm transition-colors hover:bg-white hover:text-[#14110c]"
          >
            ← 返回总览
          </Link>
        </div>
      </section>

      {/* 单栏：相关推荐侧栏已移除（站点只有三篇置顶文章，不需要互相导流） */}
      <div className="max-w-[1180px] mx-auto px-6 pt-6 pb-12">
        <div className="mx-auto w-full max-w-[820px]">
          <article className="min-w-0">
        {/* 文章标题（页面唯一 h1） */}
        <h1 className="font-editorial text-2xl md:text-3xl font-bold text-[#0f172a] leading-tight mb-3 break-words">
          {article.title}
        </h1>

        {/* 元信息行 */}
        <div className="flex items-center gap-3 text-sm flex-wrap text-[#64748b] mb-6">
          <span>{article.date}</span>
          <span className="text-[#cbd5e1]">·</span>
          <span>{categoryName}</span>
          <span className="text-[#cbd5e1]">·</span>
          <span>
            阅读{" "}
            <span className="text-[#0f172a] font-medium">
              {(article as any).viewCount || 0}
            </span>
          </span>
        </div>

        {/* 摘要 */}
        {article.summary ? (
          <blockquote className="pl-5 border-l-4 border-[#2563eb] text-lg text-[#475569] leading-relaxed mb-6">
            {article.summary}
          </blockquote>
        ) : (
          <div className="text-sm text-[#94a3b8] italic mb-6">（暂无摘要）</div>
        )}

        {/* V29c A 方案：主图区（只显示 1 张主图，用 `image` 单字段，V29 content 接管多图） */}
        {(article as any).image ? (
          <figure className="mb-8">
            <img
              src={(article as any).image}
              alt={article.title}
              className="w-full h-auto rounded-none shadow-sm object-cover"
              onError={(e: any) => {
                e.currentTarget.style.display = "none";
              }}
            />
            {(article as any).imageCaption && (
              <figcaption className="text-center text-xs text-[#94a3b8] mt-3 leading-relaxed">
                {(article as any).imageCaption}
              </figcaption>
            )}
          </figure>
        ) : null}

        {/* 正文（V29：content 字段实装，支持 ##/### 标题、• 列表、[图N] 图片 + 短行图说） */}
        {article.content && article.content.length > 0 ? (
          <div className="space-y-6 text-base text-[#334155] leading-loose">
            {parseArticleContent(article.content, article.images || [])}
          </div>
        ) : (
          <div className="space-y-6 text-base text-[#334155] leading-loose">
            {(article.summary
              ? [article.summary, "（本篇暂无完整正文，以上为摘要预览）"]
              : ["（暂无正文）"]
            ).map((p: string, i: number) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </div>
        )}

        {/* 标签云（V3b3：data.json 真实文章没 tags 字段，用 article.tag 单数兜底） */}
        <div className="mt-10 flex items-center gap-2 flex-wrap">
          {(article.tags && article.tags.length > 0
            ? article.tags
            : [article.tag || "新闻"]
          ).map((t: string, i: number) => (
            <span
              key={i}
              className="px-3 py-1 rounded-none bg-[#f1f5f9] text-[#475569] text-xs hover:bg-[#e0e7ff] hover:text-[#2563eb] transition-colors cursor-pointer"
            >
              # {t}
            </span>
          ))}
        </div>

        {/* 上一篇 / 下一篇（同分类下真实跳） */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prev ? (
            <Link
              href={`/news/${category}/${prev.id}`}
              className="group p-4 bg-white border border-[#e2e8f0] rounded-none hover:border-[#2563eb]/40 hover:shadow-md transition-all"
            >
              <div className="text-xs text-[#94a3b8] mb-2">← 上一篇</div>
              <div className="text-sm font-medium text-[#0f172a] line-clamp-2 group-hover:text-[#2563eb] transition-colors">
                {prev.title}
              </div>
              <div className="text-xs text-[#94a3b8] mt-1">{prev.date}</div>
            </Link>
          ) : (
            <div className="p-4 bg-[#f8fafc] border border-dashed border-[#e2e8f0] rounded-none text-center text-xs text-[#94a3b8]">
              ← 没有更早的文章
            </div>
          )}
          {next ? (
            <Link
              href={`/news/${category}/${next.id}`}
              className="group p-4 bg-white border border-[#e2e8f0] rounded-none hover:border-[#2563eb]/40 hover:shadow-md transition-all sm:text-right"
            >
              <div className="text-xs text-[#94a3b8] mb-2">下一篇 →</div>
              <div className="text-sm font-medium text-[#0f172a] line-clamp-2 group-hover:text-[#2563eb] transition-colors">
                {next.title}
              </div>
              <div className="text-xs text-[#94a3b8] mt-1">{next.date}</div>
            </Link>
          ) : (
            <div className="p-4 bg-[#f8fafc] border border-dashed border-[#e2e8f0] rounded-none text-center text-xs text-[#94a3b8] sm:text-right">
              没有更新的文章 →
            </div>
          )}
        </div>

        {/* 来源 */}
        <div className="mt-10 pt-6 border-t border-[#e2e8f0] text-sm text-[#94a3b8] flex flex-wrap items-center gap-3">
          <span>来源：{(article as any).source || "亚瑠啦啦队"}</span>
          <span className="text-[#cbd5e1]">·</span>
          <ViewCount
            slug={`${category}/${article.id}`}
            className="text-[#94a3b8]"
          />
        </div>

        {/* 返回按钮 */}
        <div className="mt-6 text-center">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-[#e2e8f0] rounded-none text-sm text-[#475569] hover:border-[#2563eb] hover:text-[#2563eb] transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回{CATEGORY_NAMES[category] || "列表"}
          </button>
        </div>

        {/* 占位 id 提示（仅占位文章） */}
        {isPlaceholder && (
          <div className="mt-4 text-center text-xs text-[#94a3b8]">
            当前渲染占位：<code className="px-1.5 py-0.5 rounded-none bg-[#f1f5f9] text-[#475569]">{slug}</code>
          </div>
        )}
      </article>
        </div>
      </div>
    </main>
  );
}