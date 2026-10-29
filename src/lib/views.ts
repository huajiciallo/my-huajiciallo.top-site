/*
 * 访问量的前端封装。
 * 后端是 /api/views（Cloudflare Pages Function + KV）；本地 `next dev` 没有 Functions，
 * 请求会 404，这里统一返回 null，界面就不显示计数 —— 不会报错。
 */

const API = "/api/views";

export type ViewCounts = Record<string, number>;

export async function fetchViews(): Promise<ViewCounts | null> {
  try {
    const r = await fetch(API, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || !j.ok || !j.counts) return null;
    return j.counts as ViewCounts;
  } catch {
    return null;
  }
}

/** 本次会话首次访问时 +1，之后只读取（避免刷新一直累加） */
export async function bumpView(slug: string): Promise<number | null> {
  const key = `ciallo:viewed:${slug}`;
  try {
    const seen = window.sessionStorage.getItem(key) === "1";
    const r = seen
      ? await fetch(`${API}?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        })
      : await fetch(API, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug }),
        });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || !j.ok || typeof j.count !== "number") return null;
    if (!seen) {
      try {
        window.sessionStorage.setItem(key, "1");
      } catch {
        /* 忽略 */
      }
    }
    return j.count;
  } catch {
    return null;
  }
}
