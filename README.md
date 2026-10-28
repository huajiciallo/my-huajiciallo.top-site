# 亚瑠啦啦队 · 图片刊物站

一个只有三篇内容的**个人图片刊物站**：首页一屏图片墙（文字压在图片里），
背景左右两组图随机轮播；「图集」栏目是「左图 + 右提示词」的画廊版式，
「在线工具」挂着一个独立的单页小工具。

技术栈：**Next.js 16（`output: 'export'` 纯静态导出）** + Tailwind v4 + Cloudflare Pages。

---

## 页面结构

| 路径 | 说明 |
|---|---|
| `/` | 图片墙：左边「图集」置顶大图，右边「在线工具」「资源」。背景 8 秒轮播 |
| `/`（鼠标停在四周留白 1 秒） | 背景淡入到 100%、文字内容淡出；展开时点左键手动换图 |
| `/?view=list` | 总览列表（4 个 tab、搜索、分页、置顶按钮） |
| `/news/集/篇` | 图集：左图 + 右提示词（右栏独立滚动）；其它栏目：普通文章版式 |
| `/tools/random-character.html` | 随机角色生成器（单文件 HTML，与站点同域） |

---

## 目录

```
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                首页（构建时读 public/images/bg 下的文件清单）
│  │  ├─ home/
│  │  │  ├─ HomeShell.tsx        图片墙 ⇄ 总览列表
│  │  │  └─ CategoryBoard.tsx    图片墙 + 双组背景 + 留白展开
│  │  └─ news/
│  │     ├─ PageContent.tsx      总览列表
│  │     └─ [category]/[slug]/   文章 / 图集详情
│  └─ lib/                       pins.ts（置顶三层）· hotspot.ts · parseArticleContent.tsx
├─ content/news/data.json        全部内容（文章、置顶、提示词）
├─ public/
│  ├─ images/                    正文图 + bg/left|right（背景轮播）+ logo
│  ├─ tools/                     独立小工具（HTML）
│  ├─ _redirects / _headers      Cloudflare Pages 的跳转与缓存头
├─ functions/api/pins.js         Pages Function：用 KV 存"每栏目的置顶"（可选）
└─ _archive/                     旧版组件、完整数据备份、原图（不进仓库）
```

---

## 本地开发

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 生成 out/
```

> 注意：站点用 `trailingSlash: true`，`public/` 下的独立 HTML 必须写**带扩展名的完整路径**
> （例如 `/tools/random-character.html`），否则会被 308 到目录形式而 404。

---

## 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy out --project-name <项目名>
```

或连 Git 仓库后填：

- Build command：`npm run build`
- Build output directory：`out`
- Node 版本：20 或 22

**只上传 `out/` 里的静态产物**；`node_modules`、`.next`、`_shots`、`_archive` 都不参与部署。

---

## 内容怎么改

- **文章 / 图集**：编辑 `content/news/data.json` → `npm run build`
- **图片**：放进 `public/images/`，在 data.json 里写 `"image": "/images/xxx.webp"`
- **背景轮播图**：直接丢进 `public/images/bg/left` 或 `bg/right`，**不用改代码**，重新 build 即可
- **置顶**：每个栏目一篇。data.json 里给文章加 `"pinned": true`；站点上也可以在总览页点「☆ 置顶」

## 置顶的三层记忆

```
data.json 的 "pinned"  →  localStorage  →  /api/pins（Cloudflare KV）
```

绑 KV 后置顶对所有访客生效：Pages → Settings → Bindings → KV namespace，变量名 **`PINS`**。
不绑也能用，只是只存在当前浏览器里。

详细说明见 [DEPLOY.md](./DEPLOY.md)。
