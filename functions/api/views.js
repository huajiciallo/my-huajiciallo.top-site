/*
 * 访问量统计（Cloudflare Pages Function + KV）
 *
 *   GET  /api/views             → { ok, counts: { "industry/gallery-aru-01": 12, ... } }
 *   GET  /api/views?slug=xxx    → { ok, slug, count }
 *   POST /api/views  {slug}     → 计数 +1，返回 { ok, slug, count }
 *
 * 存储：KV 命名空间 PINS（和置顶共用），键名 v:<slug>
 * 没有绑定 KV 时统一返回 501，前端会安静降级（不显示计数）。
 */

const PREFIX = "v:";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function cleanSlug(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > 120) return null;
  // 只允许 "分类/条目" 形式：字母数字 . _ - /，且不能出现 ..
  if (s.includes("..")) return null;
  if (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(s)) return null;
  return s;
}

export async function onRequestGet({ request, env }) {
  if (!env || !env.PINS) return json({ ok: false, error: "KV 未绑定" }, 501);

  const url = new URL(request.url);
  const slug = cleanSlug(url.searchParams.get("slug"));

  if (slug) {
    const n = Number(await env.PINS.get(PREFIX + slug)) || 0;
    return json({ ok: true, slug, count: n });
  }

  // 全部：按前缀列出，逐个取值（文章数量很少，够用）
  const counts = {};
  const list = await env.PINS.list({ prefix: PREFIX, limit: 1000 });
  for (const k of list.keys) {
    counts[k.name.slice(PREFIX.length)] =
      Number(await env.PINS.get(k.name)) || 0;
  }
  return json({ ok: true, counts });
}

export async function onRequestPost({ request, env }) {
  if (!env || !env.PINS) return json({ ok: false, error: "KV 未绑定" }, 501);

  let slug = null;
  try {
    const body = await request.json();
    slug = cleanSlug(body && body.slug);
  } catch {
    return json({ ok: false, error: "bad json" }, 400);
  }
  if (!slug) return json({ ok: false, error: "bad slug" }, 400);

  const key = PREFIX + slug;
  const n = Number(await env.PINS.get(key)) || 0;
  const next = n + 1;
  await env.PINS.put(key, String(next));
  return json({ ok: true, slug, count: next });
}
