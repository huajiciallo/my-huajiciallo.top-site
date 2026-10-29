"use client";

import type { ReactNode } from "react";
import AudioPill from "./AudioPill";

/*
 * 子页面统一顶栏（总览 / 图集详情 …）
 *   · 高度 56、纸色底、同一套左右内边距 —— 三个页面看起来是一条线
 *   · 播放器永远在**最右侧**，不随页面里的按钮数量左右漂移
 *   · 返回类按钮统一放在右侧，跟首页的「总览 →」同一侧，不用再往左找
 */
export default function PageBar({
  left,
  actions,
}: {
  left: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 h-14 w-full border-b border-[#14110c]/12 bg-[#ebe5d9]/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-4 px-5 md:px-8">
        <div className="flex min-w-0 items-center gap-3">{left}</div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <AudioPill />
        </div>
      </div>
    </header>
  );
}
