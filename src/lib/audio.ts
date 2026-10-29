/*
 * 全局音频：单例 <audio> 放在 React 之外，切换页面（客户端路由）不会中断播放。
 * UI 用 useSyncExternalStore 订阅状态，所以每个页面的顶栏都能渲染同一个播放器。
 */

export type Track = { title: string; src: string };

export const TRACKS: Track[] = Array.from({ length: 12 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return { title: `yaaliu ${n}`, src: `/audio/yaaliu-${n}.aac` };
});

type Snap = { index: number; playing: boolean; progress: number; volume: number };

const VOL_KEY = "ciallo:volume";
const DEFAULT_VOLUME = 0.7;

let el: HTMLAudioElement | null = null;
let volume = DEFAULT_VOLUME;
let snap: Snap = {
  index: 0,
  playing: false,
  progress: 0,
  volume: DEFAULT_VOLUME,
};
const subs = new Set<() => void>();

function set(p: Partial<Snap>) {
  snap = { ...snap, ...p };
  subs.forEach((f) => f());
}

export function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function getSnapshot(): Snap {
  return snap;
}

function loadVolume() {
  try {
    const v = Number(window.localStorage.getItem(VOL_KEY));
    if (Number.isFinite(v) && v >= 0 && v <= 1) volume = v;
  } catch {
    /* 忽略隐私模式下的异常 */
  }
}

function ensure(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (el) return el;
  loadVolume();
  const a = document.createElement("audio");
  a.preload = "metadata";
  a.src = TRACKS[0].src;
  a.volume = volume;
  a.addEventListener("ended", () => next());
  a.addEventListener("play", () => set({ playing: true }));
  a.addEventListener("pause", () => set({ playing: false }));
  a.addEventListener("timeupdate", () => {
    const d = a.duration;
    set({ progress: d && isFinite(d) && d > 0 ? a.currentTime / d : 0 });
  });
  el = a;
  set({ volume });
  return a;
}

/** 首次挂载时调用：建好 audio 元素并读回上次的音量 */
export function hydrate() {
  ensure();
}

export function playIndex(i: number) {
  const a = ensure();
  if (!a) return;
  const k = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
  a.src = TRACKS[k].src;
  a.currentTime = 0;
  set({ index: k, progress: 0 });
  a.play().catch(() => set({ playing: false }));
}

export function next() {
  playIndex(snap.index + 1);
}

export function prev() {
  playIndex(snap.index - 1);
}

export function toggle() {
  const a = ensure();
  if (!a) return;
  if (a.paused) a.play().catch(() => {});
  else a.pause();
}

export function setVolume(v: number) {
  const a = ensure();
  volume = Math.min(1, Math.max(0, v));
  if (a) a.volume = volume;
  try {
    window.localStorage.setItem(VOL_KEY, String(volume));
  } catch {
    /* 忽略 */
  }
  set({ volume });
}

export function toggleMute() {
  setVolume(snap.volume > 0 ? 0 : DEFAULT_VOLUME);
}
