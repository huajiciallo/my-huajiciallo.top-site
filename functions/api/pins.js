/*
 * Cloudflare Pages Function —— /api/pins
 * ====================================
 *
 * 作用：把"每个栏目的置顶文章 id"存到 Cloudflare KV，实现跨设备/跨访客的记忆。
 *
 * 部署前提（二选一，任选）：
 *   A. 后台：Pages 项目 → Settings → Functions → KV namespace bindings
 *      新增绑定：Variable name = PINS，选一个 KV namespace
 *   B. wrangler.toml 里加：
 *      [[kv_namespaces]]
 *      binding = "PINS"
 *      id = "<你的 namespace id>"
 *
 * 可选写保护：Pages 环境变量里设置 PINS_TOKEN=<口令>，
 *   前端会把 localStorage 的 sctent:pins:token 作为 x-pin-token 头发过来；
 *   不设置则任何人可写（内部站点足够用，公网建议设）。
 *
 * 未绑定 KV 时：GET 返回 {ok:false,pins:{}}，前端自动回退到 localStorage，
 * 静态站点的其它功能完全不受影响。
 */

const KEY = "pins";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

const CATEGORY_RE = /^[a-z0-9-]{1,40}$/;
const ARTICLE_RE = /^[a-z0-9-]{1,60}$/;

function sanitize(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input)) {
    if (typeof v !== "string") continue;
    if (!CATEGORY_RE.test(k)) continue;
    if (v === "") continue;
    if (!ARTICLE_RE.test(v)) continue;
    out[k] = v;
  }
  return out;
}

export async function onRequestGet({ env }) {
  if (!env || !env.PINS) {
    return json({ ok: false, reason: "KV_NOT_BOUND", pins: {} });
  }
  const raw = await env.PINS.get(KEY);
  let pins = {};
  try {
    pins = raw ? JSON.parse(raw) : {};
  } catch {
    pins = {};
  }
  return json({ ok: true, pins: sanitize(pins) });
}

export async function onRequestPut({ request, env }) {
  if (!env || !env.PINS) {
    return json({ ok: false, reason: "KV_NOT_BOUND" }, 501);
  }
  if (env.PINS_TOKEN && request.headers.get("x-pin-token") !== env.PINS_TOKEN) {
    return json({ ok: false, reason: "UNAUTHORIZED" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "BAD_JSON" }, 400);
  }

  const pins = sanitize(body && (body.pins ?? body));
  if (Object.keys(pins).length === 0) {
    return json({ ok: false, reason: "EMPTY_OR_INVALID" }, 400);
  }

  await env.PINS.put(KEY, JSON.stringify(pins));
  return json({ ok: true, pins });
}
