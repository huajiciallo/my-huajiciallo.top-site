"use client";

/*
 * ====================================
 *   图集详情：左图 / 右提示词（右侧独立滚动）
 * ====================================
 *
 *   · 整页固定一屏高度，页面本身不滚动
 *   · 左列图片按可用空间等比缩放（object-contain）
 *   · 右列是提示词面板，内容超长时**只滚右列**，左图与顶栏不动
 *   · 没有提示词的条目，右侧显示「略」
 */

import Link from "next/link";
import { useEffect, useRef } from "react";

type Note = string;

export default function GalleryDetail({
  article,
  categoryName,
}: {
  article: any;
  categoryName: string;
}) {
  const paneRef = useRef<HTMLDivElement | null>(null);

  // 换条目时把提示词面板滚回顶部
  useEffect(() => {
    if (paneRef.current) paneRef.current.scrollTop = 0;
  }, [article?.id]);

  const prompt: string = (article?.prompt || "").trim();
  const negative: string = (article?.negative || "").trim();
  const notes: Note[] = Array.isArray(article?.notes) ? article.notes : [];
  const negativeNotes: Note[] = Array.isArray(article?.negativeNotes)
    ? article.negativeNotes
    : [];
  const hasAny =
    prompt.length > 0 ||
    negative.length > 0 ||
    notes.length > 0 ||
    negativeNotes.length > 0;

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#f8fafc] text-[#14110c]">
      {/* 顶栏 */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#14110c]/12 bg-[#ebe5d9] px-4 md:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 border border-[#14110c]/20 bg-white/60 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-[#14110c]/75 transition-colors hover:bg-[#14110c] hover:text-white md:text-[11px]"
          >
            ← 返回首页
          </Link>
          <Link
            href="/?view=list"
            className="inline-flex items-center gap-1 border border-[#14110c]/20 bg-white/60 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-[#14110c]/75 transition-colors hover:bg-[#14110c] hover:text-white md:text-[11px]"
          >
            ← 返回总览
          </Link>
        </div>
        <h1 className="font-editorial min-w-0 flex-1 truncate text-center text-[13px] font-bold md:text-[15px]">
          {article?.title}
        </h1>
        <div className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[#14110c]/40 sm:block">
          {categoryName} · {article?.date || ""}
        </div>
      </header>

      {/* 主体：左图 / 右提示词 */}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,44vh)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:grid-rows-1">
        {/* 左：图 */}
        <div className="flex min-h-0 items-center justify-center overflow-hidden bg-[#ebe5d9] p-3 md:p-6">
          {article?.image ? (
            <img
              src={article.image}
              alt={article?.title || ""}
              className="max-h-full max-w-full object-contain shadow-[0_10px_40px_rgba(20,17,12,0.15)]"
            />
          ) : (
            <span className="font-mono text-[11px] tracking-[0.2em] text-[#8a8377]">
              暂无图片
            </span>
          )}
        </div>

        {/* 右：提示词（独立滚动） */}
        <aside
          ref={paneRef}
          className="min-h-0 overflow-y-auto border-t border-[#14110c]/12 bg-white px-5 py-5 lg:border-l lg:border-t-0"
        >
          {!hasAny ? (
            <div className="flex h-full items-center justify-center">
              <span className="font-editorial text-[28px] text-[#14110c]/15">略</span>
            </div>
          ) : (
            <div className="space-y-7">
              {prompt && (
                <section>
                  <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#2563eb]">
                    提示词 · Prompt
                  </h2>
                  <p className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-[1.85] text-[#33302a]">
                    {prompt}
                  </p>
                </section>
              )}

              {negative && (
                <section>
                  <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#b91c1c]">
                    负面提示词 · Negative
                  </h2>
                  <p className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-[1.85] text-[#4a453d]">
                    {negative}
                  </p>
                </section>
              )}

              {notes.length > 0 && (
                <section>
                  <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[#14110c]/45">
                    逐条核对 · Notes
                  </h2>
                  <div className="space-y-4">
                    {notes.map((n, i) => (
                      <p
                        key={i}
                        className="whitespace-pre-wrap break-words border-l-2 border-[#14110c]/10 pl-3 text-[12.5px] leading-[1.85] text-[#3a362f]"
                      >
                        {n}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {negativeNotes.length > 0 && (
                <section>
                  <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[#14110c]/45">
                    负面词核对 · Negative notes
                  </h2>
                  <div className="space-y-4">
                    {negativeNotes.map((n, i) => (
                      <p
                        key={i}
                        className="whitespace-pre-wrap break-words border-l-2 border-[#b91c1c]/15 pl-3 text-[12.5px] leading-[1.85] text-[#3a362f]"
                      >
                        {n}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              <p className="pb-4 font-mono text-[10px] tracking-[0.18em] text-[#14110c]/25">
                右栏可独立滚动 · 左图与顶栏不动
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
