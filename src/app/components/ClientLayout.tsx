"use client";

/*
 * ====================================
 *   全局布局组件 V8.1（兼容版）
 * ====================================
 *
 *   TinaCMS 未配置前：直接接收 JSON 数据 props
 *   TinaCMS 配置后：切换为 useTina（见注释备选代码）
 *
 *   ⚠️ 放在 D:\file\debug\my-company-site\src\app\components\ClientLayout.tsx
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// 导航数据类型（与 nav.json 对应）
interface NavItem {
  label: string;
  href: string;
  children: Array<{ label: string; href: string }>;
}

interface NavConfig {
  brandName: string;
  brandSuffix: string;
  accentColor: string;
  nav: NavItem[];
}

interface ClientLayoutProps {
  children: React.ReactNode;
  navData: NavConfig;
}

export default function ClientLayout({
  children,
  navData,
}: ClientLayoutProps) {
  const navConfig = navData;
  const navItems = navConfig.nav;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* 单栏目站（nav 为空）：不渲染顶栏。
          一是首页不需要导航遮挡画面，二是固定顶栏会盖住页面顶部 80px，
          把下面的"返回要目"等按钮的点击全部吃掉。 */}
      {navItems.length > 0 && (
        <>
          <Navbar
            navConfig={navConfig}
            navItems={navItems}
            scrolled={scrolled}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />
          <MobileDrawer
            navConfig={navConfig}
            navItems={navItems}
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
        </>
      )}
      {children}
      <BackToTop />
    </>
  );
}

/* ===== 顶部导航栏 ===== */
function Navbar({
  navConfig,
  navItems,
  scrolled,
  onOpenMobileMenu,
}: {
  navConfig: NavConfig;
  navItems: NavItem[];
  scrolled: boolean;
  onOpenMobileMenu: () => void;
}) {
  // 子页面 + 首页一致：仅在滚动时变白底（不悬停强制变白）
  const solid = scrolled;

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        solid
          ? "bg-white/95 backdrop-blur-md border-b border-[#e2e8f0] shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      {/* 全宽容器：靠左 / 居中 / 靠右 三段绝对定位
          不用 max-w-7xl 居中限制，保证 logo/中英文贴屏幕最左/最右 */}
      <div className="relative h-20">
        {/* 左侧：Logo（贴屏幕最左） */}
        <div className="absolute left-4 md:left-6 top-0 h-20 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="回到月度要目"
          >
            {/* 品牌 logo 图片（用户可替换为自有 logo）
                路径：public/images/logo.png
                规格建议：横向 高度 48-64px，宽度自适应，背景透明（PNG）
                未放图时自动降级显示文字 */}
            <img
              src="/images/logo.png"
              alt={`${navConfig.brandName}${navConfig.brandSuffix}`}
              className="h-12 md:h-16 w-auto max-w-[200px] object-contain"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "inline-flex";
              }}
            />
            {/* 文字兜底 logo（图片未加载时显示） */}
            <span
              className={`text-xl md:text-2xl font-bold tracking-tight whitespace-nowrap ${
                solid ? "text-[#0f172a]" : "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6),0_0_8px_rgba(0,0,0,0.3)]"
              }`}
              style={{ display: "none" }}
            >
              {navConfig.brandName}<span className="text-[#60a5fa]">{navConfig.brandSuffix}</span>
            </span>
          </Link>
        </div>

        {/* 中间：桌面端导航（绝对居中） */}
        <div className="absolute left-1/2 top-0 h-20 -translate-x-1/2 hidden lg:flex items-center">
          <DesktopNav navItems={navItems} solid={solid} />
        </div>

        {/* 右侧：手机端汉堡（贴屏幕最右）。导航为空（单栏目站）时不渲染 */}
        <div className="absolute right-4 md:right-6 top-0 h-20 flex items-center gap-2">
          {navItems.length > 0 && (
            <button
              className={`lg:hidden p-2 -mr-2 ${
                solid
                  ? "text-[#0f172a] hover:text-[#2563eb]"
                  : "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] hover:text-white/80"
              }`}
              onClick={onOpenMobileMenu}
              aria-label="菜单"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ===== 桌面端下拉导航 ===== */
function DesktopNav({ navItems, solid }: { navItems: NavItem[]; solid: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = (href: string) => {
    const [targetPath, hash] = href.split("#");
    if (targetPath === pathname || (targetPath === "" && href.startsWith("#"))) {
      if (hash) window.location.hash = hash;
    } else {
      router.push(href);
    }
  };

  return (
    <div className="hidden lg:flex gap-8">
      {navItems.map((item) => {
        const itemPath = item.href.split("#")[0];
        const isActive = pathname === itemPath || pathname.startsWith(itemPath + "/");
        return (
          <div key={item.label} className="relative group">
            <Link
              href={item.href}
              className={`text-[15px] font-semibold py-2 inline-flex items-center gap-1 relative ${
                solid
                  ? isActive
                    ? "text-[#2563eb]"
                    : "text-[#0f172a] hover:text-[#2563eb]"
                  : isActive
                    ? "text-[#60a5fa]"
                    : "text-white hover:text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.6),0_0_8px_rgba(0,0,0,0.3)]"
              }`}
            >
              {item.label}
              {item.children.length > 0 && (
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180 ${
                    solid ? "text-[#64748b]" : "text-white/80"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
              <span className={`absolute bottom-0 left-0 h-0.5 bg-[#2563eb] transition-all duration-300 ${
                isActive ? "w-full" : "w-0 group-hover:w-full"
              }`} />
            </Link>
            {item.children.length > 0 && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 invisible translate-y-[-8px] group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200">
                <div className="bg-white/95 backdrop-blur-lg rounded-none border border-[#e2e8f0]/60 py-1.5 min-w-[150px]" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                  {item.children.map((child) => (
                    <a
                      key={child.label}
                      href={child.href}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo(child.href);
                      }}
                      className="block px-5 py-2.5 text-[14px] font-medium text-[#475569] hover:text-[#2563eb] hover:bg-[#2563eb]/5 hover:pl-6 transition-all duration-200 cursor-pointer"
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===== 手机端右侧抽屉 ===== */
function MobileDrawer({
  navConfig,
  navItems,
  open,
  onClose,
}: {
  navConfig: NavConfig;
  navItems: NavItem[];
  open: boolean;
  onClose: () => void;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = (href: string) => {
    const [targetPath, hash] = href.split("#");
    if (targetPath === pathname || (targetPath === "" && href.startsWith("#"))) {
      if (hash) window.location.hash = hash;
    } else {
      router.push(href);
    }
  };

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const closeAndNavigate = (href: string) => {
    onClose();
    setExpandedItems(new Set());
    navigateTo(href);
  };

  const closeAndLink = () => {
    onClose();
    setExpandedItems(new Set());
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm z-[70]"
            onClick={() => { onClose(); setExpandedItems(new Set()); }}
          />
          {/* 抽屉面板 */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-72 bg-white z-[80] shadow-2xl overflow-y-auto"
          >
            {/* 抽屉头部 */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-[#e2e8f0]">
              <Link href="/" className="text-lg font-semibold text-[#0f172a]" onClick={closeAndLink}>
                {navConfig.brandName}<span className="text-[#60a5fa]">{navConfig.brandSuffix}</span>
              </Link>
              <button
                onClick={() => { onClose(); setExpandedItems(new Set()); }}
                className="text-[#64748b] hover:text-[#2563eb] transition-colors p-1"
                aria-label="关闭菜单"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 导航列表 - 手风琴折叠 */}
            <div className="py-2">
              {navItems.map((item) => {
                const isExpanded = expandedItems.has(item.label);
                return (
                  <div key={item.label} className="border-b border-[#f1f5f9]">
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <Link href={item.href} className="text-[#0f172a] font-medium text-sm flex-1" onClick={closeAndLink}>
                        {item.label}
                      </Link>
                      {item.children.length > 0 && (
                        <button
                          onClick={() => toggleExpand(item.label)}
                          className="p-1.5 text-[#94a3b8] hover:text-[#2563eb] transition-colors ml-2"
                          aria-label={isExpanded ? "收起" : "展开"}
                        >
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden bg-[#f8fafc]"
                        >
                          {item.children.map((child) => (
                            <a
                              key={child.label}
                              href={child.href}
                              className="block px-9 py-3 text-sm text-[#64748b] hover:text-[#2563eb] hover:bg-[#eff6ff] transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                closeAndNavigate(child.href);
                              }}
                            >
                              {child.label}
                            </a>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* 抽屉底部：首页快捷入口 */}
            <div className="border-t border-[#e2e8f0] px-5 py-4 mt-2">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-[#2563eb] font-medium hover:text-[#1d4ed8] transition-colors"
                onClick={closeAndLink}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                回到月度要目
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ===== 返回顶部（P3：无阴影无位移，仅 opacity + 背景色过渡）===== */
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.5);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`back-to-top${visible ? " visible" : ""}`}
      aria-label="返回顶部"
      aria-hidden={!visible}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
