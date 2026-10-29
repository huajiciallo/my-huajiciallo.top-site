"use client";

/*
 * ====================================
 *   图集详情：左图 + 缩略图切换 / 右侧提示词（独立滚动）
 * ====================================
 *
 *   · 整页一屏高度，页面本身不滚动
 *   · 左列：大图等比缩放 + 下方缩略图横条（点哪张切哪张，缩略图自动居中）
 *   · 右列：当前这张图自己的提示词 / 负面词 / 逐条核对，只滚右列
 *   · album = 构建时读 public/images/bg 得到的所有图片；
 *     没配文案的图，右侧显示「忘了」
 *   · 非相册条目（例如活动01），右栏显示「略」
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageBar from "../../../components/PageBar";
import ViewCount from "../../../components/ViewCount";

type SlideText = {
  prompt?: string;
  negative?: string;
  notes?: string[];
  negativeNotes?: string[];
} | null;

type Slide = { url: string; text: SlideText };

function buildSlides(article: any, album: string[]): Slide[] {
  const imgs: any[] = Array.isArray(article?.images) ? article.images : [];
  const find = (url: string) => imgs.find((x: any) => x && x.url === url) || null;

  if (article?.album && album.length > 0) {
    return album.map((url) => {
      const t: any = find(url);
      return {
        url,
        text: t
          ? {
              prompt: t.prompt,
              negative: t.negative,
              notes: t.notes,
              negativeNotes: t.negativeNotes,
            }
          : null,
      };
    });
  }

  return [
    {
      url: article?.image || "",
      text: {
        prompt: article?.prompt,
        negative: article?.negative,
        notes: article?.notes,
        negativeNotes: article?.negativeNotes,
      },
    },
  ];
}

export default function GalleryDetail({
  article,
  categoryName,
  category = "",
  album = [],
}: {
  article: any;
  categoryName: string;
  category?: string;
  album?: string[];
}) {
  const slides = useMemo(() => buildSlides(article, album), [article, album]);
  const [idx, setIdx] = useState(0);
  const safeIdx = Math.min(idx, Math.max(slides.length - 1, 0));
  const cur = slides[safeIdx];
  const text: SlideText = cur?.text ?? null;

  const paneRef = useRef<HTMLDivElement | null>(null);

  /* 序号窗口：窄屏 7 个 / 中屏 11 个 / 宽屏 15 个，当前张始终在中间 */
  const [winSize, setWinSize] = useState(9);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setWinSize(w < 640 ? 7 : w < 1024 ? 11 : 15);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const win = Math.min(winSize, slides.length);
  const startIdx = Math.max(
    0,
    Math.min(safeIdx - Math.floor(win / 2), slides.length - win)
  );
  const nums = Array.from({ length: win }, (_, i) => startIdx + i);

  /* 切图：右栏回到顶部 */
  useEffect(() => {
    if (paneRef.current) paneRef.current.scrollTop = 0;
  }, [safeIdx]);

  /* 左右方向键切图 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setIdx((i) => Math.min(i + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft") {
        setIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  const prompt = (text?.prompt || "").trim();
  const negative = (text?.negative || "").trim();
  const notes: string[] = Array.isArray(text?.notes) ? text.notes : [];
  const negativeNotes: string[] = Array.isArray(text?.negativeNotes)
    ? text.negativeNotes
    : [];
  const hasAny =
    prompt.length > 0 ||
    negative.length > 0 ||
    notes.length > 0 ||
    negativeNotes.length > 0;


  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#f8fafc] text-[#14110c]">
      <PageBar
        left={
          <>
            <span className="hidden font-editorial text-[13px] font-bold text-[#14110c]/45 sm:inline">
              亚瑠啦啦队
            </span>
            <span className="hidden h-3 w-px bg-[#14110c]/20 sm:block" />
            <h1 className="truncate font-editorial text-[13px] font-bold md:text-[15px]">
              {article?.title}
            </h1>
            <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[#14110c]/35 md:inline">
              {categoryName} · {article?.date || ""}
            </span>
            {category && article?.id && (
              <ViewCount
                slug={`${category}/${article.id}`}
                className="hidden shrink-0 font-mono text-[10px] tracking-[0.16em] text-[#14110c]/35 md:inline"
              />
            )}
          </>
        }
        actions={
          <>
            <Link
              href="/"
              aria-label="返回首页"
              title="返回首页"
              className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap border border-[#14110c]/25 bg-white/70 px-2 font-mono text-[10px] tracking-[0.16em] text-[#14110c]/75 transition-colors hover:bg-[#14110c] hover:text-white md:px-2.5 md:text-[11px]"
            >
              <svg
                className="h-3.5 w-3.5"
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
            </Link>
            <Link
              href="/?view=list"
              aria-label="返回总览"
              title="返回总览"
              className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap border border-[#14110c]/25 bg-white/70 px-2 font-mono text-[10px] tracking-[0.16em] text-[#14110c]/75 transition-colors hover:bg-[#14110c] hover:text-white md:px-2.5 md:text-[11px]"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="4" width="7" height="7" />
                <rect x="13" y="4" width="7" height="7" />
                <rect x="4" y="13" width="7" height="7" />
                <rect x="13" y="13" width="7" height="7" />
              </svg>
              <span className="hidden sm:inline">返回总览</span>
            </Link>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,38vh)_minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1.32fr)_minmax(0,1fr)] lg:grid-rows-1">
        {/* 左：大图 + 序号切换条 */}
        <div className="flex min-h-0 flex-col border-b border-[#14110c]/12 lg:border-b-0">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#ebe5d9] p-3 md:p-5">
            {cur?.url ? (
              <img
                key={cur.url}
                src={cur.url}
                alt={article?.title || ""}
                className="max-h-full max-w-full object-contain shadow-[0_10px_40px_rgba(20,17,12,0.15)]"
              />
            ) : (
              <span className="font-mono text-[11px] tracking-[0.2em] text-[#8a8377]">
                暂无图片
              </span>
            )}
          </div>

          {/* 序号切换条：左列底部，没有滚动条，数字两侧紧贴箭头 */}
          <div className="shrink-0 border-t border-[#14110c]/15 bg-[#e4ddce] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-mono text-[10px] tabular-nums tracking-[0.12em] text-[#14110c]/45">
                {String(safeIdx + 1).padStart(2, "0")}/
                {String(slides.length).padStart(2, "0")}
              </span>

              <div className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIdx(Math.max(safeIdx - 1, 0))}
                  disabled={safeIdx === 0}
                  aria-label="上一张"
                  className="flex h-7 w-6 shrink-0 items-center justify-center border border-[#14110c]/20 bg-white/60 text-[11px] text-[#14110c]/70 transition-colors hover:bg-[#14110c] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ‹
                </button>

                {nums.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setIdx(n)}
                    aria-label={`第 ${n + 1} 张`}
                    className={`h-7 w-7 shrink-0 font-mono text-[10px] tabular-nums transition-colors ${
                      n === safeIdx
                        ? "bg-[#14110c] text-white"
                        : "bg-white/50 text-[#14110c]/60 hover:bg-[#14110c]/15"
                    }`}
                  >
                    {String(n + 1).padStart(2, "0")}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIdx(Math.min(safeIdx + 1, slides.length - 1))}
                  disabled={safeIdx === slides.length - 1}
                  aria-label="下一张"
                  className="flex h-7 w-6 shrink-0 items-center justify-center border border-[#14110c]/20 bg-white/60 text-[11px] text-[#14110c]/70 transition-colors hover:bg-[#14110c] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 右：当前图的提示词（独立滚动） */}
        <aside
          ref={paneRef}
          className="min-h-0 overflow-y-auto border-[#14110c]/12 bg-white px-5 py-5 lg:border-l"
        >
          {!hasAny ? (
            <div className="space-y-7">
              <section>
                <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#2563eb]">
                  提示词 · Prompt
                </h2>
                <p className="text-[13px] leading-[1.85] text-[#14110c]/30">忘了</p>
              </section>
              <section>
                <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#b91c1c]">
                  负面提示词 · Negative
                </h2>
                <p className="text-[13px] leading-[1.85] text-[#14110c]/30">忘了</p>
              </section>
              <section>
                <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[#14110c]/45">
                  逐条核对 · Notes
                </h2>
                <p className="text-[13px] leading-[1.85] text-[#14110c]/30">忘了</p>
              </section>
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
