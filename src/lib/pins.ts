/*
 * ====================================
 *   置顶（Pin）映射
 * ====================================
 *
 *   规则：每个栏目最多一个置顶，共 3 个（图集 / 在线工具 / 资源），
 *        首页每个栏目的"大板块"就是该栏目的置顶文章。
 *
 *   默认值来源：content/news/data.json 里文章对象上的 "pinned": true
 *   运行期修改：localStorage（免费版静态托管没有后端，只能存在浏览器里）
 *   键名：sctent:pins:v1  形如 { "industry": "article-006", ... }
 *
 *   ⚠️ 局限：localStorage 只属于"当前这台设备的这个浏览器"。
 *      要让所有访客看到同一个置顶，需要 Pages Functions + KV（另配），
 *      或者直接改 data.json 里的 pinned 再重新 build/部署。
 */

export type PinMap = Record<string, string>;

export const PIN_STORAGE_KEY = "sctent:pins:v1";
export const PIN_TOKEN_KEY = "sctent:pins:token";
export const PIN_API = "/api/pins";

/**
 * 读云端置顶（Cloudflare Pages Function + KV）。
 * 未部署函数 / 未绑定 KV 时返回 null，调用方自动回退 localStorage。
 */
export async function fetchRemotePins(): Promise<PinMap | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(PIN_API, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = (data && (data.pins ?? data)) || {};
    const out: PinMap = {};
    Object.entries(raw).forEach(([k, v]) => {
      if (typeof v === "string" && v) out[k] = v;
    });
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * 写云端置顶。写保护口令（可选）放在 localStorage 的 sctent:pins:token 里，
 * 只有 Pages 环境变量 PINS_TOKEN 也被设置时才需要。
 */
export async function pushRemotePins(pins: PinMap): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const token = window.localStorage.getItem(PIN_TOKEN_KEY) || "";
    const res = await fetch(PIN_API, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-pin-token": token } : {}),
      },
      body: JSON.stringify({ pins }),
    });
    return res.ok;
  } catch {
    return false;
  }
}


type AnyCategory = {
  slug: string;
  shortTitle: string;
  title?: string;
  subtitle?: string;
  articles?: any[];
};

/** data.json 里的默认置顶：有 pinned:true 用它，否则取该栏目最新一篇 */
export function defaultPinMap(items: AnyCategory[]): PinMap {
  const map: PinMap = {};
  (items || []).forEach((c) => {
    const articles = Array.isArray(c.articles) ? c.articles : [];
    if (articles.length === 0) return;
    const pinned = articles.find((a) => a && a.pinned === true);
    if (pinned) {
      map[c.slug] = pinned.id;
      return;
    }
    const newest = [...articles].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    )[0];
    if (newest) map[c.slug] = newest.id;
  });
  return map;
}

/** 读取浏览器里保存的置顶（可能为空 / 可能带已删除的文章 id） */
export function readStoredPins(): PinMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: PinMap = {};
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === "string") out[k] = v;
    });
    return out;
  } catch {
    return {};
  }
}

/** 保存置顶到浏览器 */
export function saveStoredPins(pins: PinMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
  } catch {
    /* 隐私模式 / 配额满：静默失败，界面仍按当前状态显示 */
  }
}

/**
 * 合并默认值与浏览器里保存的值。
 * 保存的 id 如果已经不在该栏目里（文章被删），自动退回默认置顶。
 */
export function mergePins(base: PinMap, stored: PinMap, items: AnyCategory[]): PinMap {
  const out: PinMap = { ...base };
  (items || []).forEach((c) => {
    const wanted = stored[c.slug];
    if (!wanted) return;
    const exists = (c.articles || []).some((a) => a && a.id === wanted);
    if (exists) out[c.slug] = wanted;
  });
  return out;
}

/** 拆出某栏目的 [置顶文章, 其余文章(按日期倒序)] */
export function splitByPin(
  category: AnyCategory,
  pins: PinMap
): { pinned: any | null; rest: any[] } {
  const articles = Array.isArray(category.articles) ? category.articles : [];
  const pinId = pins[category.slug];
  const sorted = [...articles].sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || ""))
  );
  const pinned = sorted.find((a) => a && a.id === pinId) || sorted[0] || null;
  const rest = sorted.filter((a) => a && (!pinned || a.id !== pinned.id));
  return { pinned, rest };
}
