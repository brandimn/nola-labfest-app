import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const sourcePng = join(publicDir, "nola-logo.png");

async function gen(size, name) {
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  const logo = await sharp(sourcePng)
    .resize({ width: inner, height: inner, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(join(publicDir, name));
  console.log("wrote", name);
}

await gen(192, "icon-192.png");
await gen(512, "icon-512.png");
await gen(180, "apple-icon.png");
