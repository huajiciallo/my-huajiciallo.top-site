import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import navData from "../../content/global/nav.json";
import ClientLayout from "./components/ClientLayout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

/*
 * ====================================
 *   全局布局（RootLayout）V8.1（兼容版）
 * ====================================
 *
 *   TinaCMS 未配置前：直接 JSON import 读取导航数据
 *   TinaCMS 配置后：切换为 Tina 客户端获取（见注释备选代码）
 *
 *   ⚠️ 放在 D:\file\debug\my-company-site\src\app\layout.tsx
 */

export const metadata: Metadata = {
  title: "SC-TENT电子科技 - 专注电子元器件",
  description: "SC-TENT电子科技，专注共模电感、功率电感、色环电感等电子元器件的研发与制造，为工业控制、新能源汽车等领域提供专业解决方案。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <ClientLayout navData={navData}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
