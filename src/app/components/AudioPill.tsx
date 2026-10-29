"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  TRACKS,
  getSnapshot,
  hydrate,
  next,
  prev,
  setVolume,
  subscribe,
  toggle,
  toggleMute,
} from "../../lib/audio";

/*
 * 顶栏播放器胶囊：所有页面共用，固定在顶栏最右侧。
 * 音频本体在 lib/audio.ts 里（React 之外），所以翻页不会断。
 *
 * 音量：
 *   · 桌面（≥640）→ 胶囊里内嵌一根滑块，喇叭键 = 静音
 *   · 手机 → 点喇叭键弹出带滑块的小面板（手机浏览器常默认静音，必须能调）
 */
export default function AudioPill() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [volOpen, setVolOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  const btn =
    "flex h-full items-center justify-center text-[#14110c]/70 transition-colors hover:bg-[#14110c] hover:text-white";

  const speaker = (muted: boolean) => (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M8 2.1 4.5 5H2.4v6h2.1L8 13.9V2.1Z" fill="currentColor" />
      {muted ? (
        <path
          d="M10.4 6.2 13.4 9.4M13.4 6.2l-3 3.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M10.2 5.6a3.3 3.3 0 0 1 0 4.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path
            d="M12 3.9a5.6 5.6 0 0 1 0 8.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );

  return (
    <div className="relative">
      <div className="relative flex h-8 overflow-hidden border border-[#14110c]/25 bg-white/70">
        <button
          type="button"
          onClick={prev}
          aria-label="上一首"
          title="上一首"
          className={`${btn} w-6`}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={s.playing ? "暂停" : "播放"}
          title={`${s.playing ? "暂停" : "播放"} · ${TRACKS[s.index].title}`}
          className={`${btn} w-8 text-[11px]`}
        >
          {s.playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="下一首"
          title="下一首"
          className={`${btn} w-6`}
        >
          ›
        </button>

        <span className="hidden items-center border-l border-[#14110c]/15 px-2 font-mono text-[10px] tabular-nums text-[#14110c]/55 sm:flex">
          {String(s.index + 1).padStart(2, "0")}/{TRACKS.length}
        </span>

        {/* 桌面：喇叭（静音）+ 内嵌滑块 */}
        <div className="hidden items-center border-l border-[#14110c]/15 pl-1.5 pr-2 sm:flex">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={s.volume > 0 ? "静音" : "取消静音"}
            title={s.volume > 0 ? "静音" : "取消静音"}
            className="flex h-full w-5 items-center justify-center text-[#14110c]/60 transition-colors hover:text-[#14110c]"
          >
            {speaker(s.volume === 0)}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(s.volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            aria-label="音量"
            title={`音量 ${Math.round(s.volume * 100)}%`}
            className="ml-1.5 h-4 w-16 cursor-pointer accent-[#14110c]"
          />
        </div>

        {/* 手机：点喇叭弹出音量面板 */}
        <button
          type="button"
          onClick={() => setVolOpen((v) => !v)}
          aria-label="音量"
          title="音量"
          className={`${btn} w-7 border-l border-[#14110c]/15 sm:hidden ${
            volOpen ? "!bg-[#14110c] !text-white" : ""
          }`}
        >
          {speaker(s.volume === 0)}
        </button>

        {/* 进度条 */}
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-[2px] bg-[#2563eb] transition-[width] duration-200"
          style={{ width: `${Math.round(s.progress * 100)}%` }}
        />
      </div>

      {/* 手机音量面板 */}
      {volOpen && (
        <div className="absolute right-0 top-full z-40 mt-1 flex w-44 items-center gap-2 border border-[#14110c]/20 bg-[#ebe5d9] px-2.5 py-2 shadow-[0_8px_24px_rgba(20,17,12,0.18)] sm:hidden">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(s.volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            aria-label="音量"
            className="h-4 flex-1 cursor-pointer accent-[#14110c]"
          />
          <span className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-[#14110c]/60">
            {Math.round(s.volume * 100)}
          </span>
        </div>
      )}
    </div>
  );
}
