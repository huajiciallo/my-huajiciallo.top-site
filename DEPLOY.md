# 部署说明（图片墙 + 双组背景 + 工具页）

本目录是从 `D:\file\debug\my-company-site` 复制出来的副本。原项目**未做任何改动**。
现在它是一个**个人图片刊物**：一屏图片墙，文字压在图片里，背景左右两组交替轮播，
「在线工具」栏目挂着一个独立的小工具页。

---

## 一、现在的站是什么

| 地址 | 内容 |
|---|---|
| `/` | 图片墙：左图集大图 + 右「在线工具」「资源」，文字压在图片底部；右上「总览」按钮 |
| 鼠标在留白停留 1 秒 | 背景 0.14 → 1（1.6s 渐变）、内容淡出 |
| `/` 右上「总览」 | 总览列表（`/?view=list` 直达） |
| `/tools/random-character.html` | **随机角色生成器**（独立 HTML，与站点同域） |
| `/news/{category}/{slug}/` | 文章详情（3 篇里的 2 篇；工具条目没有详情页） |
| 其它 | 404 |

---

## 二、本次改的三件事

### 1. 「总览」按钮不再隐藏
原来是 10px / 35% 透明度的纯文字，基本看不见。现在是**描边按钮**：
`border border-[#14110c]/25` + 11px + 75% 墨色，悬停反色成墨底白字。

### 2. 回到内容区时的换图加了 0.7 秒缓冲
之前一出留白就立刻换图，视觉上"啪"地跳。
现在：离开留白 → 先收起（内容 1.2s 淡回、背景 1.6s 淡到 0.14），**0.7 秒后**才换下一张，
换图本身还带 1.6s 的淡入 + 轻微推近。参数在 `CategoryBoard.tsx`：

```ts
const RETURN_SWITCH_MS = 700; // 回到内容区后隔多久才换图
```

### 3. 「在线工具」挂上了随机角色生成器
- 你的 `随机角色生成器.html`（148 KB，单文件、无外部资源）已放进 **`public/tools/random-character.html`**
- **链接必须写带 `.html` 的完整路径**：`/tools/random-character.html`
  （踩过的坑：`next.config.ts` 里开了 `trailingSlash: true`，
  写无扩展名地址会被 dev 308 重定向到 `/tools/random-character/`，
  而 `public/` 下的文件不会被当成目录 index，结果就是 **404**。
  同理，把工具放成 `public/tools/xxx/index.html` 在 dev 里也会 404。）
  部署到 Cloudflare Pages 后访问 `.html` 地址会被 301 到无扩展名形式，由 Pages 正常返回，不影响使用
- `content/news/data.json` 的「在线工具」栏目新增一条：

```jsonc
{
  "id": "tool-random-character",
  "date": "2026-10-28",
  "title": "随机角色生成器",
  "summary": "二次元 / 异世界角色设计词库：词库 1071 条、灵格 115 条……",
  "image": "/images/tool-random-character.webp",   // 工具界面的截图（1040px WebP / 49KB）
  "href": "/tools/random-character.html",           // ★ 有 href 就直接跳独立页（带 .html，见下文说明）
  "pinned": true,                                   // 让它占据首页「在线工具」那一格
  "tag": "小工具",
  "images": [], "content": []
}
```

- 代码里补了 `href` 支持：首页卡片、总览列表都会优先用 `article.href`，
  只有没有 `href` 的条目才走 `/news/{category}/{slug}/` 详情页
- `generateStaticParams` 会**跳过带 `href` 的条目**，所以不会为工具生成一个空详情页
- 原来那条「专精特新」文章仍在总览里（`在线工具 02`），随时可以点「☆ 置顶」换回首页

---

## 三、背景轮播规则（上一轮定的，未变）

| 组 | 来源 | 文件 | 张数 |
|---|---|---|---|
| 左 | `aru (4)~(14)` | `public/images/bg/left/l-01…l-11.webp` | 11 |
| 右 | `aru (15)~(22)` | `public/images/bg/right/r-01…r-08.webp` | 8 |

1. 每次切换在左右两组之间交替，组内随机
2. 自动切换 8 秒一次，**只在「指针在内容区、且背景未展开」时计时**；指针靠近边缘立刻停表
3. 留白停留 1 秒 → 展开（1.6s 渐变）
4. 展开状态下**点左键 = 手动切一张**（并拦截隐形图片链接的点击）
5. 指针回到内容区 → 收起 + 0.7 秒后换一张 + 重新计时

---

## 四、目录结构

```
ciallo_top/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx / page.tsx / globals.css
│  │  ├─ components/ClientLayout.tsx
│  │  ├─ home/
│  │  │  ├─ HomeShell.tsx         图墙 ⇄ 总览（?view=list）
│  │  │  └─ CategoryBoard.tsx     ★ 图片墙 + 双组背景 + 悬停展开
│  │  └─ news/
│  │     ├─ PageContent.tsx       总览列表（支持 href 条目）
│  │     └─ [category]/[slug]/    文章详情（跳过 href 条目）
│  └─ lib/  bgImages.ts · pins.ts · hotspot.ts · parseArticleContent.tsx
├─ functions/api/pins.js          Pages Function（KV 读写）
├─ content/news/data.json         4 条：图集 1 + 在线工具 2（含工具）+ 资源 1
├─ public/
│  ├─ tools/random-character.html ★ 独立工具页
│  ├─ images/bg/left|right/       19 张背景 WebP
│  └─ images/*.jpg|png|webp       正图 + 工具封面 + logo
├─ out/                           ★ 部署包
├─ _shots/                        四张截图（可删）
└─ _archive/                      13 篇完整备份 / aru 原图 / 旧组件
```

---

## 五、体积

| | 数值 |
|---|---|
| **部署包 `out/`** | **4.91 MB / 118 文件** |
| 页面 | 8 个 html（首页 + 2 篇详情 + 404 + `tools/random-character.html`） |
| 工具页 | 148 KB（单文件） |
| 背景图 | 19 张 WebP / 1.10 MB |
| `node_modules` | 360.96 MB（可删） |

---

## 六、构建与上传

```powershell
cd D:\file\策划项目\SRPG\ciallo_top
npm run dev      # 本地预览 http://localhost:3000
npm run build    # 生成 out/
npx wrangler pages deploy out --project-name my-company-site
```

**只传 `out/`**；`functions/` 由 wrangler 自动打包（要在项目根执行）。

---

## 七、以后再加工具 / 调参数

**加第二个工具页**：
1. 把 html 放进 `public/tools/xxx.html`
2. 在 `data.json` 的 `company.articles` 里加一条，写 `"href": "/tools/xxx"` 和 `"image"`
3. 想让它上首页就把 `"pinned": true` 加给它

**常用参数**（`CategoryBoard.tsx` 顶部）：

| 常量 | 默认 | 作用 |
|---|---|---|
| `AUTO_MS` | 8000 | 自动换图间隔 |
| `HOVER_DELAY_MS` | 1000 | 留白停留多久开始展开 |
| `REVEAL_MS` | 1600 | 展开/收起渐变时长 |
| `RETURN_SWITCH_MS` | 700 | 回到内容区后延迟多久换图 |

---

## 八、还没做

1. **KV 绑定**（需要你的 Cloudflare 账号）：Pages → Settings → Bindings → KV namespace，变量名 `PINS`
2. 触屏设备没有 hover，只会看到 14% 的静帧背景（需要的话可以加"点空白处展开"）
3. `article-011` 标题里 `SC-TENTTTT…` 是笔误

---

## 九、最新一轮改动（图集提示词页 / 背景自动读目录 / banner 压缩）

### 1. 背景图改成"读文件夹"，加删图片不用改代码
之前 `src/lib/bgImages.ts` 是写死的清单，你删了 `l-08.webp` 之后清单里还留着 → 首页出现空白。
现在改成：`src/app/page.tsx` 在**构建时**用 `fs.readdirSync` 读
`public/images/bg/left` 和 `public/images/bg/right`，把文件名列表作为 props 传给首页组件，
`src/lib/bgImages.ts` 已删除。

**以后加背景图**：直接把图片丢进对应文件夹 → `npm run build` → 生效。
文件名随意（`_`/`-` 排序），支持 webp / jpg / png / avif / gif。左右两组的交替规则不变。

### 2. banner-news 压缩
你把 `banner-news.png` 换成了 3861×1086 / **4.15 MB** 的新图。
已转成 **1920px 宽 WebP，84 KB**（`public/images/banner-news.webp`），
`data.json` 的 `banner.background` 和两个 tsx 里的回落路径都已改成 `.webp`；
原 PNG 移到 `_archive/banner-originals/banner-news.png`，不再部署。

### 3. 图集新增一条带提示词的条目 + 专属「左图右文」版式
- `data.json` 的 `industry` 新增 `gallery-aru-01`（配图 `public/images/bg/left/l-01.webp`），
  字段：`prompt`（正向提示词）、`negative`（负面）、`notes`（逐条核对 10 条）、`negativeNotes`（负面核对 5 条），
  并已设为该栏目置顶（首页大图现在就是这张）
- **图集的所有条目都改走专用版式** `src/app/news/[category]/[slug]/GalleryDetail.tsx`：
  - 整页 `h-[100dvh] overflow-hidden`，**页面本身不滚动**
  - 左列图片 `object-contain` 等比铺满可用高度
  - 右列提示词面板 `overflow-y-auto` —— **只滚右列**，图片和顶栏不动
  - 没有提示词的条目（例如 `article-006`）右栏居中显示一个淡色的「略」
  - 顶栏固定有「← 返回首页」「← 返回总览」
  - 移动端自动变成「上图下文」（图 44vh，文字区独立滚动）
- 其它栏目（在线工具 / 资源）仍是原来的文章版式

**以后加一条图集**：在 `industry.articles` 里加对象，填 `image`、`title`，
提示词放 `prompt`/`negative`/`notes`，不填就直接显示「略」。