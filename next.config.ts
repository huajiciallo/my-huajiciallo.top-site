import type { NextConfig } from "next"; 
const nextConfig: NextConfig = {
  output: 'export',
  // 静态导出后每个页面输出为 /xxx/index.html（而不是 xxx.html）。
  // 好处：Cloudflare Pages 上 /about 与 /about/ 两种写法都能命中，
  // 并修掉「案例页链接带尾斜杠、产物却是无尾斜杠 .html」导致的 404。
  trailingSlash: true,
  // V40.2：cases 详情页从 2 级 /cases/{slug} 升级到 3 级 /cases/{category}/{slug}
  // 旧 5 个 URL 301 重定向 → 静态导出模式不支持 redirects()，改用静态 _redirects / _headers / 404.html 方案
  // async redirects() {
  //   return [
  //     { source: '/cases/case-industrial-plc-01', destination: '/cases/industrial/case-industrial-plc-01', permanent: true },
  //     { source: '/cases/case-ev-oem-01', destination: '/cases/ev/case-ev-oem-01', permanent: true },
  //     { source: '/cases/case-consumer-pd-01', destination: '/cases/consumer/case-consumer-pd-01', permanent: true },
  //     { source: '/cases/case-telecom-5g-01', destination: '/cases/telecom/case-telecom-5g-01', permanent: true },
  //     { source: '/cases/case-medical-ct-01', destination: '/cases/medical/case-medical-ct-01', permanent: true },
  //   ];
  // },
};
export default nextConfig;
