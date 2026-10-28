import fs from "node:fs";
import path from "node:path";
import data from "../../content/news/data.json";
import HomeShell from "./home/HomeShell";

/*
 * ====================================
 *   首页
 * ====================================
 *
 *   背景轮播图不写死在代码里：这里在构建时直接读
 *   public/images/bg/left 与 public/images/bg/right 两个文件夹，
 *   里面有什么图就用什么图 —— 增删图片不需要改任何代码（重新 build 即可）。
 */

const IMG_RE = /\.(webp|jpe?g|png|avif|gif)$/i;

function listBg(folder: "left" | "right"): string[] {
  try {
    const dir = path.join(process.cwd(), "public", "images", "bg", folder);
    return fs
      .readdirSync(dir)
      .filter((f) => IMG_RE.test(f))
      .sort((a, b) => a.localeCompare(b, "en"))
      .map((f) => `/images/bg/${folder}/${f}`);
  } catch {
    return [];
  }
}

export default function Page() {
  return (
    <HomeShell
      data={data}
      bgLeft={listBg("left")}
      bgRight={listBg("right")}
    />
  );
}
