"use client";

/*
 * ====================================
 *   首页外壳：图集首页 ⇄ 总览列表
 * ====================================
 *
 *   view === "index" → 图片为主的首页（CategoryBoard）
 *   view === "list"  → 总览列表（news/PageContent，强制 overview + 隐藏内部模式切换）
 *
 *   支持 /?view=list 直达总览（文章详情页的「返回总览」按钮用的就是它）。
 *   注意：读的是 window.location，不是 useSearchParams —— 后者会把整页降级成
 *   客户端渲染，首屏就白了。代价是带参数时先渲染首页再切过去（一瞬间）。
 */

import { Suspense, useEffect, useState } from "react";
import PageContent from "../news/PageContent";
import CategoryBoard from "./CategoryBoard";
import PageBar from "../components/PageBar";

export default function HomeShell({
  data,
  bgLeft = [],
  bgRight = [],
}: {
  data: any;
  bgLeft?: string[];
  bgRight?: string[];
}) {
  const [view, setView] = useState<"index" | "list">("index");

  const total = (data?.items || []).reduce(
    (s: number, c: any) => s + (c.articles?.length || 0),
    0
  );

  // 支持 /?view=list 直达
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "list") setView("list");
  }, []);

  const switchTo = (next: "index" | "list") => {
    setView(next);
    if (typeof window === "undefined") return;
    try {
      const url = next === "list" ? "/?view=list" : "/";
      window.history.replaceState(null, "", url);
    } catch {
      /* 忽略 */
    }
    window.scrollTo({ top: 0 });
  };

  if (view === "list") {
    return (
      <main>
        <PageBar
          left={
            <>
              <span className="shrink-0 font-editorial text-[14px] font-bold tracking-[0.02em] text-[#14110c]/80 md:text-[17px]">
                亚瑠啦啦队
              </span>
              <span className="hidden h-3 w-px shrink-0 bg-[#14110c]/20 sm:block" />
              <span className="hidden truncate font-mono text-[11px] tracking-[0.2em] text-[#14110c]/45 sm:block">
                活动总览 · {String(total).padStart(2, "0")} 篇
              </span>
            </>
          }
          actions={
            <button
              onClick={() => switchTo("index")}
              aria-label="返回首页"
              title="返回首页"
              className="group inline-flex h-8 items-center gap-1.5 whitespace-nowrap border border-[#14110c]/25 bg-white/70 px-2 font-mono text-[10px] tracking-[0.14em] text-[#14110c]/75 transition-colors hover:bg-[#14110c] hover:text-white sm:px-3 sm:text-[11px] sm:tracking-[0.18em]"
            >
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-8.5Z" />
              </svg>
              <span className="hidden sm:inline">返回首页</span>
            </button>
          }
        />

        <Suspense fallback={null}>
          <PageContent data={data} defaultMode="overview" hideModeSwitch />
        </Suspense>
      </main>
    );
  }

  return (
    <CategoryBoard
      data={data}
      bgLeft={bgLeft}
      bgRight={bgRight}
      onOpenList={() => switchTo("list")}
    />
  );
}
