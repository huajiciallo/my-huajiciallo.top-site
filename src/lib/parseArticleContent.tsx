// @ts-nocheck
/*
 * ====================================
 *   parseArticleContent - 共用文章正文渲染器
 * ====================================
 *
 *   从 news 详情页 V29 抽离（V40.2 升级）
 *   - 接收 content: string[] + images: { url, caption }[]
 *   - 渲染为 ReactNode[] 返回
 *
 *   支持的 markdown 语法：
 *   - ## 二级标题（居中 + 蓝色下划线）
 *   - ### 三级标题（居中）
 *   - - 列表项（连续多行累积成 ul，● 蓝色 marker）
 *   - [图N] 图片引用（同行多个 + 跨行累积，1/2/3 列 grid，短行做图说）
 *   - 空行 = 段落分隔
 *   - 普通文本 = 段落（whitespace-pre-line）
 *
 *   用法：
 *   - news 详情页：import { parseArticleContent } from "@/lib/parseArticleContent"
 *   - cases 详情页：同上，问题/方案/成果三段式各调用一次
 *
 *   放在 D:\file\debug\my-company-site\src\lib\parseArticleContent.tsx
 */

import type { ReactNode } from "react";

export function parseArticleContent(
  content: string[],
  images: { url: string; caption: string }[]
): ReactNode[] {
  const elements: ReactNode[] = [];
  let paraBuf: string[] = [];
  let i = 0;
  let key = 0;
  const flushPara = () => {
    const text = paraBuf.join("\n").trim();
    if (text) {
      elements.push(<p key={key++} className="whitespace-pre-line">{text}</p>);
    }
    paraBuf = [];
  };
  while (i < content.length) {
    const line = content[i];
    const trimmed = (line || "").trim();
    // 二级标题 ## xxx
    if (trimmed.startsWith("## ")) {
      flushPara();
      elements.push(
        <h2 key={key++} className="text-center text-xl md:text-2xl font-bold mt-8 mb-4 text-[#0f172a]">
          <span className="inline-block border-b-2 border-[#2563eb] pb-2">
            {trimmed.slice(3)}
          </span>
        </h2>
      );
      i++;
      continue;
    }
    // 三级标题 ### xxx
    if (trimmed.startsWith("### ")) {
      flushPara();
      elements.push(
        <h3 key={key++} className="text-center text-lg font-bold mt-6 mb-3 text-[#0f172a]">
          {trimmed.slice(4)}
        </h3>
      );
      i++;
      continue;
    }
    // 列表 - xxx
    if (trimmed.startsWith("- ")) {
      flushPara();
      const items: string[] = [];
      while (i < content.length && (content[i] || "").trim().startsWith("- ")) {
        items.push((content[i] || "").trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="space-y-2 pl-0 my-4">
          {items.map((t, j) => (
            <li key={j} className="flex items-start gap-3 text-[#334155] leading-loose">
              <span className="text-[#2563eb] text-lg font-bold flex-shrink-0 leading-loose">●</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    // 图片 [图N]
    const imgMatches = [...trimmed.matchAll(/\[图(\d+)\]/g)];
    if (imgMatches.length > 0) {
      flushPara();
      const idxArr: number[] = imgMatches.map(m => parseInt(m[1], 10) - 1);
      i++;
      while (i < content.length) {
        const mList = [...(content[i] || "").trim().matchAll(/\[图(\d+)\]/g)];
        if (mList.length > 0) {
          idxArr.push(...mList.map(x => parseInt(x[1], 10) - 1));
          i++;
        } else break;
      }
      let caption = "";
      if (i < content.length) {
        const next = (content[i] || "").trim();
        if (next && !next.startsWith("##") && !next.startsWith("###") && !next.startsWith("•") && !/\[图\d+\]/.test(next) && next.length < 30) {
          caption = next;
          i++;
        }
      }
      const validImgs = idxArr.map(idx => images[idx]).filter(Boolean);
      if (validImgs.length === 1) {
        elements.push(
          <figure key={key++} className="my-6">
            <img src={validImgs[0].url} alt={validImgs[0].caption || caption} className="w-full rounded-none shadow-sm" onError={(e: any) => { e.currentTarget.style.display = "none"; }} />
            {(caption || validImgs[0].caption) && <figcaption className="text-center text-sm text-[#94a3b8] mt-3">{caption || validImgs[0].caption}</figcaption>}
          </figure>
        );
      } else if (validImgs.length === 2) {
        elements.push(
          <div key={key++} className="my-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validImgs.map((img, j) => <figure key={j}><img src={img.url} alt={img.caption || ""} className="w-full rounded-none shadow-sm" onError={(e: any) => { e.currentTarget.style.display = "none"; }} /></figure>)}
            </div>
            {caption && <div className="text-center text-sm text-[#94a3b8] mt-3">{caption}</div>}
          </div>
        );
      } else if (validImgs.length >= 3) {
        elements.push(
          <div key={key++} className="my-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {validImgs.map((img, j) => <figure key={j}><img src={img.url} alt={img.caption || ""} className="w-full rounded-none shadow-sm" onError={(e: any) => { e.currentTarget.style.display = "none"; }} /></figure>)}
            </div>
            {caption && <div className="text-center text-sm text-[#94a3b8] mt-3">{caption}</div>}
          </div>
        );
      }
      continue;
    }
    // 空行 = 段落分隔
    if (trimmed === "") {
      flushPara();
    } else {
      paraBuf.push(line);
    }
    i++;
  }
  flushPara();
  return elements;
}
