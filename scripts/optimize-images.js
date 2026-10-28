// ====================================
//  图片瘦身脚本（可选，一次性）
// ====================================
// 只做两件安全的事，不改文件名、不改格式、不改任何引用：
//   1. 宽度 > 1920px 的图，等比缩到 1920px
//   2. JPEG 统一用 mozjpeg q82 重新编码（肉眼看不出差别，体积通常减半）
// 宽度已经 <=1920 的 PNG 不动 —— 实测 sharp 重压 PNG 对这类图反而更大。
//
// 用法：node scripts/optimize-images.js
// 依赖：sharp（Next 的可选依赖，通常已存在于 node_modules）
//
// 注意：脚本会原地覆盖 public/images 下的文件，请先备份或在 Git 里跑。

const fs = require("fs");
const path = require("path");

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("[optimize-images] 未安装 sharp，跳过。可执行 npm i -D sharp 后重试。");
  process.exit(0);
}

const ROOT = path.resolve(__dirname, "..");
const IMG_DIR = path.join(ROOT, "public", "images");
const MAX_WIDTH = 1920;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// Windows 上偶尔会遇到文件被占用（缩略图/杀软）导致覆盖失败，
// 所以先写临时文件再 rename 替换。
function writeSafely(file, buf) {
  const tmp = `${file}.opt.tmp`;
  fs.writeFileSync(tmp, buf);
  try {
    fs.renameSync(tmp, file);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

(async () => {
  if (!fs.existsSync(IMG_DIR)) {
    console.error("[optimize-images] 找不到 public/images");
    process.exit(1);
  }
  const files = walk(IMG_DIR).filter((f) => /\.(png|jpe?g)$/i.test(f));
  let before = 0;
  let after = 0;
  let changed = 0;

  for (const file of files) {
    const rel = path.relative(IMG_DIR, file);
    const origSize = fs.statSync(file).size;
    before += origSize;
    const meta = await sharp(file).metadata();
    const tooWide = meta.width > MAX_WIDTH;
    const isJpeg = meta.format === "jpeg";

    if (!tooWide && !isJpeg) {
      after += origSize;
      continue;
    }

    let pipe = sharp(file);
    if (tooWide) pipe = pipe.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    pipe = isJpeg
      ? pipe.jpeg({ quality: 82, mozjpeg: true })
      : pipe.png({ compressionLevel: 9, effort: 10 });

    const buf = await pipe.toBuffer();
    if (buf.length < origSize) {
      writeSafely(file, buf);
      after += buf.length;
      changed++;
      console.log(
        `  ${rel}: ${(origSize / 1024).toFixed(0)}KB → ${(buf.length / 1024).toFixed(0)}KB` +
          (tooWide ? `  (${meta.width}px → ${MAX_WIDTH}px)` : "")
      );
    } else {
      after += origSize;
    }
  }

  console.log(
    `[optimize-images] 处理 ${changed} 个文件，图片总体积 ${(before / 1024 / 1024).toFixed(2)}MB → ${(
      after /
      1024 /
      1024
    ).toFixed(2)}MB`
  );
})();
