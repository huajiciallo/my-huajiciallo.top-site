// @ts-nocheck
"use client";

/*
 * ====================================
 *   新闻动态 - 页面内容组件 V19
 *   ====================================
 *   Hero 横幅与栏目1一致（220px + img 标签）
 *   折叠式筛选控制台：5 TAB 整合为下拉筛选框 + 月 + 年 + 排序 + 搜索
 *   默认全部（activeSlug=all，月份=0，年份=0）
 *   去 box 风格：去 rounded-none/白底/阴影/双层边框，只留 border-b 淡下划线
 *   移动端适配：分类下拉 + 月/年/排序并排 + 搜索独占一行
 *   三大分类：行业动态 / 公司动态 / 红色题材
 *   放在 D:\file\debug\my-company-site\src\app\news\PageContent.tsx
 *
 *   V23 模式化改造：
 *   1. 顶部加 "热点/总览" 切换按钮（mobile 隐藏，桌面端显示）
 *   2. mode === 'hotspot' 走杂志版式（V23.2 实现），分类不影响（9B）
 *   3. mode === 'overview' 走论坛列表（V23.3 实现），分类生效
 *   4. mobile 默认走 overview（V20 沿用）
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { flattenArticles, groupByMonth, sortMonthArticles } from "../../lib/hotspot";
import {
  defaultPinMap,
  mergePins,
  readStoredPins,
  saveStoredPins,
  fetchRemotePins,
  pushRemotePins,
  type PinMap,
} from "../../lib/pins";

// ---------- 类型定义 ----------
interface Article {
  id: string;
  date: string;
  tag: string;
  title: string;
  summary: string;
  image?: string;
}

interface NewsItem {
  slug: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  articles: Article[];
}

interface PageContentProps {
  data: {
    sidebarTitle: string;
    banner: {
      eyebrow: string;
      title: string;
      subtitle: string;
      background: string;
    };
    items: NewsItem[];
  };
  /** 默认视图：hotspot（旧杂志版式）/ overview（总览列表）。URL 上的 ?mode= 优先 */
  defaultMode?: "hotspot" | "overview";
  /** 隐藏「热点 / 总览」切换（首页封面已在外部提供切换入口时使用） */
  hideModeSwitch?: boolean;
}

// ---------- 分类标签颜色映射 ----------
const TAG_COLORS: Record<string, string> = {
  "图集": "bg-[#2563eb] text-white",
  "在线工具": "bg-[#1d4ed8] text-white",
  "资源": "bg-[#dc2626] text-white",
};

// 根据 slug 获取分类名
function getCategoryName(slug: string): string {
  const map: Record<string, string> = {
    industry: "图集",
    company: "在线工具",
    "red-theme": "资源",
  };
  return map[slug] || slug;
}

// 根据 slug 获取分类标签样式
function getCategoryStyle(slug: string): string {
  const map: Record<string, string> = {
    industry: "bg-[#2563eb] text-white",
    company: "bg-[#1d4ed8] text-white",
    "red-theme": "bg-[#dc2626] text-white",
    rectification: "bg-[#475569] text-white",
  };
  return map[slug] || "bg-[#64748b] text-white";
}

// V23.3：根据 slug 获取淡色分类标签样式（论坛列表用）
function getCategoryStyleLight(slug: string): string {
  const map: Record<string, string> = {
    industry: "bg-[#eff6ff] text-[#2563eb]",
    company: "bg-[#eef2ff] text-[#1d4ed8]",
    "red-theme": "bg-[#fef2f2] text-[#dc2626]",
    rectification: "bg-[#f1f5f9] text-[#475569]",
  };
  return map[slug] || "bg-[#f1f5f9] text-[#64748b]";
}

// ---------- 组件 ----------
export default function PageContent({ data, defaultMode, hideModeSwitch }: PageContentProps) {
  const BANNER = data.banner || {};
  const newsItems: NewsItem[] = data.items || [];
  const SIDEBAR_TITLE = data.sidebarTitle || "新闻动态";

  // V3b2：点横条进详情页时，记录"目标返回页 = /news?mode=overview&category=分类"
  // 不管从 hotspot 还是 overview 进，都跳回 overview+分类
  // 详情页 handleBack 优先用这个 sessionStorage，没有才 push 兜底
  const rememberBackUrl = (catSlug: string) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("news_back_url", `/?mode=overview&category=${catSlug}`);
  };

  // V24：模式切换（'hotspot' = 按月杂志版式，'overview' = 论坛流式列表）
  // 初始化从 URL ?mode= 读取（详情页返回时保留模式）
  const searchParams = useSearchParams();
  const urlMode = searchParams.get("mode") as "hotspot" | "overview" | null;
  const [mode, setMode] = useState<"hotspot" | "overview">(
    urlMode === "overview" || urlMode === "hotspot" ? urlMode : defaultMode || "hotspot"
  );
  // V24：当前选中的分类 slug（"all" 表示全部，"other" 表示其他）
  // 初始化从 URL ?category= 读取（详情页返回时保留分类）
  const urlCategory = searchParams.get("category");
  const [activeSlug, setActiveSlug] = useState<string>(urlCategory || "all");

  // 置顶：每个栏目一篇。默认取 data.json 里的 pinned:true（没有则取该栏目最新一篇）。
  // 记忆三层：data.json（构建默认）→ localStorage（本机）→ /api/pins（Cloudflare KV，部署后生效）
  const [pins, setPins] = useState<PinMap>(() =>
    defaultPinMap(newsItems as any)
  );
  useEffect(() => {
    setPins((base) => mergePins(base, readStoredPins(), newsItems as any));
    fetchRemotePins().then((remote) => {
      if (!remote) return;
      const merged = mergePins(
        defaultPinMap(newsItems as any),
        remote,
        newsItems as any
      );
      setPins(merged);
      saveStoredPins(merged);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const togglePin = (catSlug: string, id: string) => {
    if (!catSlug) return;
    setPins((prev) => {
      const next = { ...prev, [catSlug]: prev[catSlug] === id ? "" : id };
      saveStoredPins(next);
      pushRemotePins(next);
      return next;
    });
  };

  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState("");
  // 月份筛选（0=全部月份，1-12=具体月份；V19 默认 0=全年）
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  // 年份筛选（0=全部年份；V19 默认 0=全年）
  const [selectedYear, setSelectedYear] = useState<number>(0);
  // 排序：newest=最新优先，oldest=最早优先
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  // V23.3：当前页码（30 条/页分页）
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 15;


  // 五个 Tab 定义（含每个分类的文章数）
  const tabs = useMemo(() => {
    const countFor = (slug: string) => {
      if (slug === "all") {
        return newsItems.reduce((s, n) => s + n.articles.length, 0);
      }
      if (slug === "other") return 0;
      return newsItems.find((n) => n.slug === slug)?.articles.length || 0;
    };
    return [
      { slug: "all", label: "全部", count: countFor("all") },
      ...newsItems.map((item) => ({
        slug: item.slug,
        label: item.shortTitle,
        count: countFor(item.slug),
      })),
    ];
  }, [newsItems]);

  // 当前激活的分类信息
  const activeItem = newsItems.find((item) => item.slug === activeSlug);

  // 合并 + 筛选后的文章列表
  const filteredArticles = useMemo(() => {
    let articles: Array<Article & { categorySlug: string; categoryName: string }> = [];

    if (activeSlug === "all") {
      // 全部：合并所有分类的文章
      newsItems.forEach((item) => {
        item.articles.forEach((a) => {
          articles.push({
            ...a,
            categorySlug: item.slug,
            categoryName: item.shortTitle,
          });
        });
      });
    } else if (activeSlug === "other") {
      // 其他：暂留空，预留扩展位
      articles = [];
    } else {
      // 单个分类
      const item = newsItems.find((i) => i.slug === activeSlug);
      if (item) {
        articles = item.articles.map((a) => ({
          ...a,
          categorySlug: item.slug,
          categoryName: item.shortTitle,
        }));
      }
    }

    // 月份筛选
    if (selectedMonth > 0) {
      articles = articles.filter((a) => {
        const month = parseInt(a.date.split("-")[1], 10);
        return month === selectedMonth;
      });
    }

    // 年份筛选
    if (selectedYear > 0) {
      articles = articles.filter((a) => {
        const year = parseInt(a.date.split("-")[0], 10);
        return year === selectedYear;
      });
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.tag.toLowerCase().includes(q)
      );
    }

    // 排序
    articles.sort((a, b) => {
      if (sortOrder === "newest") return b.date.localeCompare(a.date);
      return a.date.localeCompare(b.date);
    });

    // 置顶：该栏目置顶的那篇永远排最前（其余保持上面的日期顺序）
    const pinId = pins[activeSlug];
    if (pinId) {
      articles.sort((a, b) =>
        a.id === pinId ? -1 : b.id === pinId ? 1 : 0
      );
    }

    return articles;
  }, [activeSlug, searchQuery, newsItems, selectedMonth, selectedYear, sortOrder, pins]);

  // V23.3：分页切片
  const pagedArticles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredArticles.slice(start, start + PAGE_SIZE);
  }, [filteredArticles, currentPage]);

  // V23.3：总页数
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));

  // 从所有文章中提取可选年份（去重 + 倒序）
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    newsItems.forEach((item) => {
      item.articles.forEach((a) => {
        const y = parseInt(a.date.split("-")[0], 10);
        if (!isNaN(y)) years.add(y);
      });
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [newsItems]);

  // V23.2 热点模式数据：按月分组 + 1大图（featured 优先，否则 viewCount 最高）+ 2x2小图（剩余 viewCount 倒序）+ 文字堆砌（剩余）
  const hotspotData = useMemo(() => {
    // 1. 扁平化所有文章（带 viewCount + featured + categorySlug/Name）
    type ArticleWithMeta = Article & {
      viewCount: number;
      featured?: boolean;
      categorySlug: string;
      categoryName: string;
    };
    const allArticles: any[] = flattenArticles(newsItems); const _legacyPush: any[] = [];
    newsItems.forEach((item) => {
      item.articles.forEach((a) => {
        _legacyPush.push({
          ...a,
          viewCount: (a as any).viewCount || 0,
          featured: (a as any).featured || false,
          categorySlug: item.slug,
          categoryName: item.shortTitle,
        });
      });
    });

    // 2. 按月分组（date 前 7 位 = "YYYY-MM"）
    const monthMap = new Map<string, ArticleWithMeta[]>();
    allArticles.forEach((a) => {
      const ym = a.date.substring(0, 7);
      if (!monthMap.has(ym)) monthMap.set(ym, []);
      monthMap.get(ym)!.push(a);
    });

    // 3. 月份倒序
    const sortedMonths = groupByMonth(allArticles as any);

    // 3.5 V28.7 B 方案：按板块过滤（每个月份1板块为整体不能拆散）
    const filteredMonths = sortedMonths.filter(([ym]) => {
      if (selectedYear > 0 && !ym.startsWith(String(selectedYear) + "-")) return false;
      if (selectedMonth > 0 && !ym.endsWith("-" + String(selectedMonth).padStart(2, "0"))) return false;
      return true;
    });

    // 4. V23.2.1 2 列布局：leftBig（viewCount 最高，featured 优先）+ rightBig（第 2 高）+ rightTextList(3 个横条) + leftTextOnly(剩余)
    return filteredMonths.map(([ym, articles]) => {
      const sorted = sortMonthArticles(articles as any); if (false) [articles].sort((a: any, b: any) => {
        if ((b.featured ? 1 : 0) !== (a.featured ? 1 : 0)) {
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        }
        return b.viewCount - a.viewCount;
      });
      const leftBig = sorted[0] || null;
      const rightBig = sorted[1] || null;
      const rightTextList = sorted.slice(2, 5);
      const leftTextOnly = sorted.slice(5);
      return { ym, leftBig, rightBig, rightTextList, leftTextOnly, count: articles.length };
    });
  }, [newsItems, selectedMonth, selectedYear]);

  // ============ V19 删除：默认月/年 + Fallback（默认值已改 0，不再需要） ============

  // V23.3：筛选条件变化时，重置到第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSlug, searchQuery, selectedMonth, selectedYear, sortOrder]);

  // Hash 路由同步
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "all" || !hash) {
        setActiveSlug("all");
      } else {
        const found = newsItems.find((item) => item.slug === hash);
        if (found) setActiveSlug(hash);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [newsItems]);

  // 首页化改造：URL 上的 ?category= 变化时同步分类
  // （顶部导航用 /?category=industry 这类地址跳转，同名路由只改 query 不会重挂组件）
  useEffect(() => {
    const c = searchParams.get("category");
    if (!c) {
      // 回到「首页」这种不带分类、也不带 hash 的情况，复位到全部
      if (!window.location.hash) setActiveSlug("all");
      return;
    }
    if (c === "all" || newsItems.some((item) => item.slug === c)) {
      setActiveSlug(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabSwitch = (slug: string) => {
    setActiveSlug(slug);
    window.history.replaceState(null, "", `/#${slug === "all" ? "" : slug}`);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* ============ Hero banner - P0 统一：280px + 装饰线 + 主色眉头 + 分阶入场 ============ */}
      <section className="relative h-[280px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={BANNER.background || "/images/banner-news.webp"}
            alt=""
            className="w-full h-full object-cover"
            onError={(e: any) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        {/* 顶部细装饰线 — 主色锚点 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-[#2563eb]/60 to-transparent" />
        {/* 底部细装饰线 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#2563eb] rounded-none" />
        <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
          <motion.div
            className="text-xs font-mono tracking-[0.3em] text-[#2563eb] mb-3 font-bold"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {BANNER.eyebrow || "NEWS · 03"}
          </motion.div>
          <motion.h1
            className="text-3xl md:text-5xl font-bold text-[#0f172a] leading-tight mb-2 tracking-wide"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            {BANNER.title || "新闻动态"}
          </motion.h1>
          <motion.p
            className="text-[#475569] text-sm md:text-base max-w-3xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: "easeOut" }}
          >
            {BANNER.subtitle || "EMC 行业动态 · 技术洞察 · 公司新闻"}
          </motion.p>
        </div>
      </section>

      {/* ============ 顶部标签行（原「首页 › 新闻动态」面包屑，独立站里已无层级可指，改为栏目化小标） ============ */}
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="border-b border-[#e2e8f0] py-3 mt-4 md:mt-6">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-[#64748b]">
            <span className="text-[#0f172a]">{SIDEBAR_TITLE}</span>
            <span className="text-[#cbd5e1]">/</span>
            <span>总览</span>
          </div>
        </div>
      </div>

      {/* ============ P2 无框文字 Tab：Bloomberg/FT 风格（彻底抛弃 chip 框） ============ */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8 md:mt-12">
        {/* 顶部信息条：编号眉头 + 横向规则线 + 共 X 篇 + 清除筛选（固定位置） */}
        <div className="flex items-baseline justify-between gap-4 mb-10">
          <div className="flex items-baseline gap-4 md:gap-6 flex-1 min-w-0">
            <span className="text-sm font-mono tracking-[0.3em] text-[#94a3b8] flex-shrink-0">
              {String(tabs.length).padStart(2, "0")} / {String(tabs.length).padStart(2, "0")}
            </span>
            <span className="text-sm font-mono tracking-[0.3em] text-[#2563eb] font-bold flex-shrink-0">
              NEWSROOM
            </span>
            <span className="flex-1 h-px bg-[#e2e8f0] min-w-[24px]" />
          </div>
          <div className="flex items-baseline gap-4 flex-shrink-0">
            <span className="text-sm font-mono text-[#94a3b8] tracking-wider">
              <span className="text-[#0f172a] font-bold text-base">{String(filteredArticles.length).padStart(2, "0")}</span>
              {" / "}
              {String(newsItems.reduce((s, n) => s + n.articles.length, 0)).padStart(2, "0")} ITEMS
            </span>
            <button
              onClick={() => {
                setActiveSlug("all");
                setSelectedMonth(0);
                setSelectedYear(0);
                setSearchQuery("");
                setSortOrder("newest");
              }}
              disabled={activeSlug === "all" && selectedYear === 0 && selectedMonth === 0 && !searchQuery}
              className={`text-sm font-medium transition-all ${
                activeSlug === "all" && selectedYear === 0 && selectedMonth === 0 && !searchQuery
                  ? "text-[#cbd5e1] cursor-not-allowed"
                  : "text-[#2563eb] hover:underline"
              }`}
            >
              清除筛选 ×
            </button>
          </div>
        </div>

        {/* 第一行：模式切换无框文字 + 分类无框文字 Tab + 搜索（同行） */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6 mb-2">
          {/* 模式切换 - 无框文字 + 底线（紧凑型，无背景容器）；首页封面模式下隐藏 */}
          {!hideModeSwitch && (
          <div className="flex items-center gap-5 lg:gap-6 flex-shrink-0 border-b border-transparent">
            <button
              onClick={() => setMode("hotspot")}
              className={`relative pb-2 text-base tracking-wide transition-colors ${
                mode === "hotspot"
                  ? "text-[#0f172a] font-bold"
                  : "text-[#475569] font-medium hover:text-[#0f172a]"
              }`}
            >
              热点
              {mode === "hotspot" && (
                <motion.div
                  layoutId="news-mode-underline"
                  className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#2563eb]"
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              )}
            </button>
            <button
              onClick={() => setMode("overview")}
              className={`relative pb-2 text-base tracking-wide transition-colors ${
                mode === "overview"
                  ? "text-[#0f172a] font-bold"
                  : "text-[#475569] font-medium hover:text-[#0f172a]"
              }`}
            >
              总览
              {mode === "overview" && (
                <motion.div
                  layoutId="news-mode-underline"
                  className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#2563eb]"
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              )}
            </button>
          </div>
          )}

          {/* 分类无框文字 Tab + 底线（仅总览模式显示，flex-wrap 自然换行） */}
          {mode === "overview" && (
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 flex-1 min-w-0">
              {tabs.map((tab) => {
                const isActive = tab.slug === activeSlug;
                return (
                  <button
                    key={tab.slug}
                    onClick={() => handleTabSwitch(tab.slug)}
                    className={`relative pb-2 text-base tracking-wide transition-colors ${
                      isActive
                        ? "text-[#0f172a] font-bold"
                        : "text-[#475569] font-medium hover:text-[#0f172a]"
                    }`}
                  >
                    {tab.label}
                    <span className="text-xs font-mono text-[#94a3b8] ml-2">{String(tab.count).padStart(2, "0")}</span>
                    {isActive && (
                      <motion.div
                        layoutId="news-category-underline"
                        className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#2563eb]"
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* 搜索框 - 下划线式（极简） */}
          <div className="relative w-full lg:w-56 flex-shrink-0 lg:ml-auto">
            <svg className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索文章..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-3 py-2 bg-transparent border-b border-[#e2e8f0] text-base text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0f172a] transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#94a3b8] hover:text-[#2563eb] transition-colors"
                title="清除搜索"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 第二行：年份 + 月份 + 排序（无框文字 + 底线） */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-7 border-t border-[#e2e8f0]">
          <span className="text-xs font-mono tracking-[0.25em] text-[#94a3b8] flex-shrink-0">
            FILTER ·
          </span>

          {/* 年份无框文字 + 底线 */}
          <button
            onClick={() => setSelectedYear(0)}
            className={`relative pb-1.5 text-sm tracking-wide transition-colors ${
              selectedYear === 0
                ? "text-[#0f172a] font-bold"
                : "text-[#475569] font-medium hover:text-[#0f172a]"
            }`}
          >
            全部年份
            {selectedYear === 0 && (
              <motion.div
                layoutId="news-year-underline"
                className="absolute left-0 right-0 -bottom-px h-[1.5px] bg-[#2563eb]"
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            )}
          </button>
          {availableYears.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`relative pb-1.5 text-sm tracking-wide transition-colors ${
                selectedYear === y
                  ? "text-[#0f172a] font-bold"
                  : "text-[#475569] font-medium hover:text-[#0f172a]"
              }`}
            >
              {y} 年
              {selectedYear === y && (
                <motion.div
                  layoutId="news-year-underline"
                  className="absolute left-0 right-0 -bottom-px h-[1.5px] bg-[#2563eb]"
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              )}
            </button>
          ))}

          <span className="text-[#cbd5e1] text-sm">|</span>

          {/* 月份 - 原生 select 下划线式 */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="appearance-none bg-transparent pr-5 pb-1.5 text-sm text-[#475569] hover:text-[#0f172a] border-b border-[#e2e8f0] focus:outline-none focus:border-[#0f172a] cursor-pointer transition-all font-medium"
            >
              <option value={0}>全部月份</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m} 月</option>
              ))}
            </select>
            <svg className="absolute right-0 bottom-2 w-3 h-3 text-[#94a3b8] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <span className="text-[#cbd5e1] text-sm">|</span>

          {/* 排序无框文字 + 底线 */}
          <button
            onClick={() => setSortOrder("newest")}
            className={`relative pb-1.5 text-sm tracking-wide transition-colors ${
              sortOrder === "newest"
                ? "text-[#0f172a] font-bold"
                : "text-[#475569] font-medium hover:text-[#0f172a]"
            }`}
          >
            最新优先
            {sortOrder === "newest" && (
              <motion.div
                layoutId="news-sort-underline"
                className="absolute left-0 right-0 -bottom-px h-[1.5px] bg-[#2563eb]"
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            )}
          </button>
          <button
            onClick={() => setSortOrder("oldest")}
            className={`relative pb-1.5 text-sm tracking-wide transition-colors ${
              sortOrder === "oldest"
                ? "text-[#0f172a] font-bold"
                : "text-[#475569] font-medium hover:text-[#0f172a]"
            }`}
          >
            最早优先
            {sortOrder === "oldest" && (
              <motion.div
                layoutId="news-sort-underline"
                className="absolute left-0 right-0 -bottom-px h-[1.5px] bg-[#2563eb]"
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            )}
          </button>
        </div>

        {/* 分类描述（仅在选了具体分类时显示） */}
        {activeItem && activeSlug !== "all" && activeSlug !== "other" && (
          <div className="mt-4 mb-2">
            <h2 className="text-lg font-bold text-[#0f172a]">{activeItem.title}</h2>
            <p className="text-sm text-[#475569] mt-1">{activeItem.subtitle}</p>
          </div>
        )}
      </div>

      {/* ============ 主内容区（V23 模式分支） ============ */}
      {mode === "hotspot" ? (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 bg-transparent">
          <div className="space-y-12">
            {hotspotData.map(({ ym, leftBig, rightBig, rightTextList, leftTextOnly, count }) => {
              const [year, month] = ym.split("-");
              const monthEn = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][parseInt(month, 10) - 1];
              const monthStr = parseInt(month, 10).toString().padStart(2, "0");
              return (
                <div key={ym} className="bg-transparent">


                  {/* 2 列布局：左 2/3 + 右 1/3 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
                    {/* 左列 2/3：leftBig + leftTextOnly */}
                    <div className="col-span-1 md:col-span-2 space-y-6">
                      {leftBig && (
                        <Link
                          href={`/news/${leftBig.categorySlug}/${leftBig.id}`}
                          onClick={() => rememberBackUrl(leftBig.categorySlug)}
                          className="group block cursor-pointer relative h-full overflow-hidden"
                        >
                          {leftBig.image ? (
                            <img src={leftBig.image} alt={leftBig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#eff6ff] to-[#f1f5f9]">
                              <svg className="w-24 h-24 text-[#cbd5e1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                            </div>
                          )}
                          <div className="absolute top-4 left-4 md:top-5 md:left-8 pointer-events-none">
                            <div className="absolute -inset-x-4 -top-4 bottom-0 bg-gradient-to-b from-black/60 via-black/25 to-transparent pointer-events-none" />
                            <div className="relative text-[64px] md:text-[180px] font-thin tracking-normal leading-none text-white/90 select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                              {monthStr.split("").join(" ")}
                            </div>
                            <div className="relative text-[10px] md:text-xs font-medium tracking-[0.3em] text-white/70 mt-1 uppercase">
                              {monthEn} · {year} · {count} 篇
                            </div>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
                          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 text-white">
                            <h4 className="text-xl md:text-3xl font-bold mb-2 truncate leading-tight">{leftBig.title}</h4>
                            <p className="text-sm md:text-base text-white/70 line-clamp-2 mb-2">{
                          leftBig.summary
                        }</p>
                            <p className="text-[10px] md:text-xs text-white/50">
                              {leftBig.date} · {leftBig.tag} · <span className="text-white/80 font-medium">{leftBig.viewCount.toLocaleString()} 阅读</span>
                            </p>
                          </div>
                        </Link>
                      )}


                    </div>

                    {/* 右列 1/3：rightBig + rightTextList 3 个横条 */}
                    <div className="col-span-1 md:col-span-1 flex flex-col space-y-3">
                      {rightBig && (
                        <Link
                          href={`/news/${rightBig.categorySlug}/${rightBig.id}`}
                          onClick={() => rememberBackUrl(rightBig.categorySlug)}
                          className="group block cursor-pointer relative h-[500px] overflow-hidden"
                        >
                          {rightBig.image ? (
                            <img src={rightBig.image} alt={rightBig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#eff6ff] to-[#f1f5f9]">
                              <svg className="w-20 h-20 text-[#cbd5e1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
                          <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 text-white">
                            <h4 className="text-base md:text-lg font-bold mb-1.5 line-clamp-2 leading-tight">{rightBig.title}</h4>
                            <p className="text-xs text-white/70 line-clamp-2 mb-1.5">{rightBig.summary}</p>
                            <p className="text-[10px] text-white/50">
                              {rightBig.date} · {rightBig.tag} · <span className="text-white/80 font-medium">{rightBig.viewCount.toLocaleString()} 阅读</span>
                            </p>
                          </div>
                        </Link>
                      )}

                      <div className="flex-1 flex flex-col gap-2">
                        {rightTextList.slice(0, 2).map((art, idx) => (
                          <Link
                            key={art.id}
                            href={`/news/${art.categorySlug}/${art.id}`}
                            onClick={() => rememberBackUrl(art.categorySlug)}
                            className="group block cursor-pointer border border-[#cbd5e1] rounded-none px-3 py-2 hover:bg-[#f8fafc] hover:border-[#94a3b8] transition-colors"
                          >
                            <h5 className="text-sm font-medium text-[#0f172a] group-hover:text-[#2563eb] line-clamp-1">
                              {art.title}
                            </h5>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#64748b]">
                              <span>{art.date}</span>
                              <span className="text-[#cbd5e1]">·</span>
                              <span>{art.tag}</span>
                            </div>
                          </Link>
                        ))}
                        {rightTextList.length > 0 && (
                          <button
                            onClick={() => {
                              setMode("overview");
                              setSelectedYear(parseInt(year, 10));
                              setSelectedMonth(parseInt(month, 10));
                            }}
                            className="w-full text-center text-sm text-[#2563eb] font-medium py-2 border border-[#cbd5e1] rounded-none hover:bg-[#eff6ff] hover:border-[#2563eb] hover:text-[#1d4ed8] transition-all"
                          >
                            更多内容
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (      /* 文章卡片网格（原 V19 总览列表） */
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* 这里原本是 AnimatePresence + motion.div（initial opacity:0）：
            服务端只输出 opacity:0 的内联样式，hydration 一旦失败整张列表就永远不可见。
            列表是主内容，直接静态渲染，不做入场动画。 */}
        <div>
            {filteredArticles.length === 0 ? (
              /* 空状态 */
              <div className="flex flex-col items-center justify-center py-20 text-[#94a3b8]">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <p className="text-sm">暂无相关文章</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-sm text-[#2563eb] hover:underline"
                  >
                    清除搜索
                  </button>
                )}
              </div>
            ) : (
              /* V23.3 论坛风格横条列表（15 条/页）—— 去掉 whileInView 入场：
                 原先 initial opacity:0 + whileInView 会在 JS 未执行/未触发时把整张列表留在透明状态，
                 和旧产品页"有内容却整片空白"是同一个坑。 */
              <div className="space-y-3">
                {pagedArticles.map((article, idx) => (
                  <div
                    key={article.id}
                    className="group relative flex items-stretch gap-2 bg-white border border-[#e2e8f0] rounded-none hover:border-[#2563eb]/40 hover:shadow-md transition-all duration-200"
                  >
                    <Link
                      href={(article as any).href || `/news/${article.categorySlug}/${article.id}`}
                      onClick={() => rememberBackUrl(article.categorySlug)}
                      className="flex flex-1 gap-4 p-4 min-w-0 cursor-pointer"
                    >
                      {/* 缩略图（V23.3 动态显示，没图自动隐藏） */}
                      {article.image && (
                        <div className="flex-shrink-0 w-24 h-16 overflow-hidden rounded-none bg-[#f1f5f9]">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}

                      {/* 文字部分 */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        {/* 标题 */}
                        <h3 className="text-base font-bold text-[#0f172a] line-clamp-1 group-hover:text-[#2563eb] transition-colors">
                          {article.title}
                        </h3>
                        {/* 摘要 */}
                        <p className="text-sm text-[#475569] line-clamp-1 mt-1">
                          {article.summary}
                        </p>
                        {/* 底部信息：日期 + 分类 + 置顶标记 */}
                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                          <span className="text-[#94a3b8]">{article.date}</span>
                          <span className="text-[#cbd5e1]">·</span>
                          <span className={`px-2 py-0.5 rounded-none ${getCategoryStyleLight(article.categorySlug)}`}>
                            {article.categoryName}
                          </span>
                          {pins[article.categorySlug] === article.id && (
                            <span className="px-2 py-0.5 rounded-none bg-[#2563eb] text-white">
                              ★ 置顶
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* 置顶按钮：每个栏目只保留一篇。
                        "全部"下不显示（置顶按栏目算），该栏目只有 1 篇时也不显示（没得选）。 */}
                    <div className="flex items-center pr-3">
                      {activeSlug !== "all" && filteredArticles.length > 1 && (
                      <button
                        onClick={() => togglePin(article.categorySlug, article.id)}
                        title={
                          pins[article.categorySlug] === article.id
                            ? "取消置顶"
                            : "设为该栏目置顶（每栏目仅一篇）"
                        }
                        className={`px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] border transition-colors ${
                          pins[article.categorySlug] === article.id
                            ? "border-[#2563eb] bg-[#2563eb] text-white"
                            : "border-[#e2e8f0] text-[#94a3b8] hover:border-[#2563eb] hover:text-[#2563eb]"
                        }`}
                      >
                        {pins[article.categorySlug] === article.id ? "★ 已置顶" : "☆ 置顶"}
                      </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* V23.3 分页器（仅当总页数 > 1 时显示） */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-[#e2e8f0] rounded-none hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={
                  "min-w-[2rem] px-2 py-1.5 text-sm rounded-none transition-colors " +
                  (p === currentPage
                    ? "bg-[#2563eb] text-white"
                    : "border border-[#e2e8f0] hover:bg-[#f1f5f9]")
                }
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-[#e2e8f0] rounded-none hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </div>
      )}
    </main>
  );
}