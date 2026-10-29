"use client";

/*
 * ====================================
 *   首页：图片墙（三篇置顶）+ 背景轮播
 * ====================================
 *
 *   版面：整幅图片墙，文字压在图片内部（小字 + 渐变压暗），没有图下说明行。
 *
 *   背景规则：
 *     · 两组图（左 = aru(4)~(14) 共 11 张，右 = aru(15)~(22) 共 8 张）
 *     · 每次切换在左/右两组之间交替，组内随机取一张
 *     · 自动切换 8 秒一次，但只在「指针在内容区、且未展开背景」时进行；
 *       指针一移到边缘留白就立刻停表
 *     · 留白处停留 1 秒 → 背景 0.14 → 1（1.6s 渐变）、内容 1 → 0
 *     · 展开状态下点左键 = 手动切一张
 *     · 指针回到内容区 → 立刻收起 + 立刻切一张 + 重新开始 8 秒计时
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  defaultPinMap,
  fetchRemotePins,
  mergePins,
  readStoredPins,
  saveStoredPins,
  type PinMap,
} from "../../lib/pins";
import AudioPill from "../components/AudioPill";

const AUTO_MS = 8000; // 自动切换间隔
const HOVER_DELAY_MS = 1000; // 留白处停留多久开始展开
const REVEAL_MS = 1600; // 背景展开/收起的渐变时长（原来 900ms，放慢 0.7s）
const RETURN_SWITCH_MS = 700; // 回到内容区后，隔多久才换下一张（避免"啪"地跳图）

/** 条目链接：有 href 就直连独立页（工具等），否则进文章详情 */
function hrefFor(slug: string, a: any) {
  if (!a) return "#";
  return a.href || `/news/${slug}/${a.id}/`;
}

function pickPinned(category: any, pins: PinMap) {
  const articles: any[] = Array.isArray(category?.articles) ? category.articles : [];
  if (articles.length === 0) return null;
  const pinId = pins[category.slug];
  const hit = articles.find((a) => a && a.id === pinId);
  if (hit) return hit;
  return [...articles].sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || ""))
  )[0];
}

const randomIndex = (len: number) => (len > 0 ? Math.floor(Math.random() * len) : 0);

/* 图片 + 内嵌小字 */
function PhotoCard({
  href,
  src,
  title,
  category,
  big,
}: {
  href: string;
  src?: string;
  title: string;
  category: string;
  big?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative block h-full w-full overflow-hidden bg-[#ded6c6]"
    >
      {src ? (
        <img
          src={src}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono text-[10px] tracking-[0.2em] text-[#8a8377]">
          暂无图片
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-3.5 pb-3">
        <h2
          className={`font-editorial min-w-0 leading-snug text-white/90 ${
            big ? "text-[13px] md:text-[15px]" : "text-[12px] md:text-[13px]"
          }`}
        >
          <span className="line-clamp-2">{title}</span>
        </h2>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">
          {category}
        </span>
      </div>
    </Link>
  );
}

export default function CategoryBoard({
  data,
  bgLeft = [],
  bgRight = [],
  onOpenList,
}: {
  data: any;
  /** 左组背景图（构建时从 public/images/bg/left 读出来，加/删图不用改代码） */
  bgLeft?: string[];
  /** 右组背景图（public/images/bg/right） */
  bgRight?: string[];
  onOpenList: () => void;
}) {
  const items: any[] = Array.isArray(data?.items) ? data.items : [];

  const [pins, setPins] = useState<PinMap>(() => defaultPinMap(items));
  // side: 0 = 左组，1 = 右组
  const [side, setSide] = useState<0 | 1>(0);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [outside, setOutside] = useState(false);
  const [ready, setReady] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const wasOutsideRef = useRef(false);
  const revealedRef = useRef(false);
  const sideRef = useRef<0 | 1>(0);
  const returnTimerRef = useRef<number | null>(null);

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  /* 下一张：左右交替，组内随机（用 ref 记录当前组，避免在 setState 更新函数里做副作用） */
  const advance = useCallback(() => {
    const next = (sideRef.current === 0 ? 1 : 0) as 0 | 1;
    sideRef.current = next;
    setSide(next);
    setIdx(randomIndex(next === 0 ? bgLeft.length : bgRight.length));
  }, [bgLeft.length, bgRight.length]);

  /* 首张随机（挂载后再随机，避免 SSR / hydration 不一致） */
  useEffect(() => {
    const s: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
    sideRef.current = s;
    setSide(s);
    setIdx(randomIndex(s === 0 ? bgLeft.length : bgRight.length));
    setReady(true);
  }, [bgLeft.length, bgRight.length]);

  /* 置顶：本机 + 云端 */
  useEffect(() => {
    let alive = true;
    setPins((base) => mergePins(base, readStoredPins(), items));
    fetchRemotePins().then((remote) => {
      if (!alive || !remote) return;
      const merged = mergePins(defaultPinMap(items), remote, items);
      setPins(merged);
      saveStoredPins(merged);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 预热两组背景图 */
  useEffect(() => {
    const t = window.setTimeout(() => {
      [...bgLeft, ...bgRight].forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  /* 自动切换：指针在内容区、且没展开时才计时；一靠近边缘（outside）立刻停表 */
  useEffect(() => {
    if (outside) return;
    const t = window.setTimeout(advance, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [outside, side, idx, advance]);

  /* 指针是否在内容块之外 */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = contentRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const out =
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom;
      setOutside((prev) => (prev === out ? prev : out));
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  /* 留白停留 1 秒才展开；离开留白 → 收起，并在 0.7 秒后再换一张（带渐变的"软着陆"） */
  useEffect(() => {
    if (outside) {
      wasOutsideRef.current = true;
      if (returnTimerRef.current !== null) {
        window.clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }
      const t = window.setTimeout(() => setRevealed(true), HOVER_DELAY_MS);
      return () => window.clearTimeout(t);
    }

    setRevealed(false);
    if (wasOutsideRef.current) {
      wasOutsideRef.current = false;
      // 只有"真的展开过"才在回到内容区时换一张；只是路过边缘不算
      if (revealedRef.current && returnTimerRef.current === null) {
        returnTimerRef.current = window.setTimeout(() => {
          returnTimerRef.current = null;
          advance();
        }, RETURN_SWITCH_MS);
      }
    }
  }, [outside, advance]);

  /* 卸载时清掉延时器 */
  useEffect(
    () => () => {
      if (returnTimerRef.current !== null) {
        window.clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }
    },
    []
  );

  /* 展开状态下按左键：手动切一张（并拦掉隐形的图片链接） */
  useEffect(() => {
    if (!revealed) return;
    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      advance();
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [revealed, advance]);

  const pool = side === 0 ? bgLeft : bgRight;
  const bgSrc = pool[idx] || pool[0] || "";

  const [lead, ...rest] = items;
  const leadArticle = lead ? pickPinned(lead, pins) : null;
  const sides = rest.slice(0, 2);

  return (
    <main className="relative min-h-screen text-[#14110c]">
      {/* ══ 背景轮播（固定层，main 不铺底色才能透出来） ══ */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-[#ebe5d9]" aria-hidden="true">
        <div
          className="absolute inset-0 transition-opacity ease-out"
          style={{ opacity: revealed ? 1 : 0.14, transitionDuration: `${REVEAL_MS}ms` }}
        >
          {ready && bgSrc && (
            <img
              key={bgSrc}
              src={bgSrc}
              alt=""
              className="bg-fade h-full w-full object-cover"
            />
          )}
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-[#14110c] transition-opacity ease-out"
          style={{ opacity: revealed ? 0.18 : 0, transitionDuration: `${REVEAL_MS}ms` }}
        />
      </div>

      {/* ══ 内容层 ══ */}
      <div
        ref={contentRef}
        className="mx-auto flex min-h-screen max-w-[1280px] flex-col px-5 pb-6 pt-6 transition-opacity duration-[1200ms] ease-out md:px-8 md:pt-7"
        style={{ opacity: revealed ? 0 : 1 }}
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-4">
          <h1 className="font-editorial text-[15px] font-bold tracking-[0.02em] text-[#14110c]/80 md:text-[17px]">
            亚瑠啦啦队
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onOpenList}
              className="group inline-flex items-center gap-2 border border-[#14110c]/25 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.18em] text-[#14110c]/75 transition-colors hover:border-[#14110c] hover:bg-[#14110c] hover:text-white"
            >
              总览
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
            <AudioPill />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3 lg:grid-rows-2 lg:gap-4">
          {lead && (
            <div className="min-h-[46vh] lg:col-span-2 lg:row-span-2 lg:min-h-0">
              <PhotoCard
                big
                href={hrefFor(lead.slug, leadArticle)}
                src={leadArticle?.image}
                title={leadArticle?.title || `${lead.shortTitle} · 暂无内容`}
                category={lead.shortTitle}
              />
            </div>
          )}
          {sides.map((c) => {
            const a = pickPinned(c, pins);
            return (
              <div key={c.slug} className="min-h-[30vh] lg:min-h-0">
                <PhotoCard
                  href={hrefFor(c.slug, a)}
                  src={a?.image}
                  title={a?.title || `${c.shortTitle} · 暂无内容`}
                  category={c.shortTitle}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 展开时吞掉点击，避免误点到隐形的图片链接 */}
      {revealed && <div className="fixed inset-0 z-40" aria-hidden="true" />}
    </main>
  );
}
