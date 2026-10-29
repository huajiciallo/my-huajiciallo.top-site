"use client";

import { useEffect, useState } from "react";
import { bumpView } from "../../lib/views";

/*
 * 进入页面时把该条目的访问量 +1（同一会话只加一次），并显示累计数。
 * 后端不可用（本地 dev / 没绑 KV）时什么都不渲染。
 */
export default function ViewCount({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    bumpView(slug).then((v) => {
      if (alive) setN(v);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (n === null) return null;

  return (
    <span className={className} title="累计浏览量">
      {n.toLocaleString("zh-CN")} 次浏览
    </span>
  );
}
