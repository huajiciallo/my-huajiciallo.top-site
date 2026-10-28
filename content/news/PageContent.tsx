// @ts-nocheck
"use client";

/*
 * ====================================
 *   资讯中心 - 页面内容组件 V8（TinaCMS 可视化编辑）
 * ====================================
 *   ⚠️ 放在 D:\file\debug\my-company-site\app\news\PageContent.tsx
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type NewsData = {
  news: {
    sidebarTitle: string;
    bannerImage: string;
    items: Array<{
      slug: string;
      shortTitle: string;
      title: string;
      subtitle: string;
      articles: Array<{
        date: string;
        tag: string;
        title: string;
        summary: string;
      }>;
    }>;
  };
};

interface PageContentProps {
  data: any;
}

export default function PageContent({ data }: PageContentProps) {
  const pageData = data;
  const SIDEBAR_TITLE = pageData.sidebarTitle;
  const BANNER_IMAGE = pageData.bannerImage;
  const newsItems = pageData.items;

  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = newsItems[activeIndex];

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        const idx = newsItems.findIndex((item) => item.slug === hash);
        if (idx >= 0) setActiveIndex(idx);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [newsItems]);

  const handleTabSwitch = (index: number) => {
    setActiveIndex(index);
    const slug = newsItems[index].slug;
    window.history.replaceState(null, "", `/news#${slug}`);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="pt-20">
        <div className="w-full h-20 md:h-36 bg-gradient-to-r from-[#dbeafe] to-[#f1f5f9] overflow-hidden"
          style={BANNER_IMAGE ? { backgroundImage: `url('${BANNER_IMAGE}')`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          {!BANNER_IMAGE && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[#94a3b8] text-sm">横幅图片区域 · 1920×200</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 md:pl-8 md:pr-12">
        <div className="border-b border-[#e2e8f0] py-3 mt-4 md:mt-6">
          <div className="flex items-center text-sm text-[#475569]">
            <Link href="/" className="hover:text-[#2563eb] transition-colors">首页</Link>
            <span className="mx-2 text-[#94a3b8]">›</span>
            <span className="text-[#475569] font-medium">{SIDEBAR_TITLE}</span>
            <span className="mx-2 text-[#94a3b8]">›</span>
            <span className="text-[#0f172a] font-medium">{activeItem.shortTitle}</span>
          </div>
        </div>

        {/* 桌面端水平Tab */}
        <div className="hidden md:flex justify-between items-center mt-6 mb-2 px-4">
          <div className="flex gap-3">
            {newsItems.slice(0, 2).map((item, i) => (
              <button key={i} onClick={() => handleTabSwitch(i)}
                className={`px-8 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${i === activeIndex ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/20" : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a]"}`}>
                {item.shortTitle}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            {newsItems.slice(2).map((item, i) => (
              <button key={i + 2} onClick={() => handleTabSwitch(i + 2)}
                className={`px-8 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${(i + 2) === activeIndex ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/20" : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a]"}`}>
                {item.shortTitle}
              </button>
            ))}
          </div>
        </div>

        {/* 手机端水平滚动Tab */}
        <div className="md:hidden flex gap-2 overflow-x-auto mt-4 mb-2 px-1 py-2">
          {newsItems.map((item, i) => (
            <button key={i} onClick={() => handleTabSwitch(i)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${i === activeIndex ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/20" : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"}`}>
              {item.shortTitle}
            </button>
          ))}
        </div>

        <div className="py-6 md:py-8 px-2 md:px-4">
          <motion.div key={activeIndex} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
            <div className="mb-6 md:mb-8 max-w-4xl">
              <h1 className="text-xl md:text-2xl font-bold text-[#0f172a] mb-2">{activeItem.title}</h1>
              <p className="text-[#475569] text-sm">{activeItem.subtitle}</p>
            </div>

            <div className="space-y-4 md:space-y-6 max-w-4xl">
              {activeItem.articles.map((item, idx) => (
                <div key={idx}
                  className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-[#e2e8f0] hover:shadow-md hover:border-[#dbeafe] transition-all duration-200 cursor-pointer">
                  <div className="flex flex-col md:flex-row items-start gap-3 md:gap-6">
                    <div className="flex-shrink-0 flex md:flex-col items-center md:text-center gap-3 md:gap-0 md:min-w-[80px]">
                      <p className="text-2xl font-bold text-[#2563eb]">
                        {item.date.split("~")[0].split("-").slice(-1)[0].replace(/^0/, "")}
                      </p>
                      <p className="text-xs text-[#94a3b8] mt-0 md:mt-1">
                        {item.date.split("~")[0].split("-").slice(0, 2).join("/").replace(/-/, "/")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-[#eff6ff] text-[#2563eb] text-xs font-medium px-2.5 py-0.5 rounded-full">{item.tag}</span>
                      </div>
                      <h3 className="text-base font-bold text-[#0f172a] mb-2 hover:text-[#2563eb] transition-colors">{item.title}</h3>
                      <p className="text-sm text-[#475569] leading-relaxed">{item.summary}</p>
                      {item.date.includes("~") && (
                        <p className="text-xs text-[#94a3b8] mt-3">📅 展会日期：{item.date}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
