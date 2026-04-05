import sharp from "sharp";
import fs from "fs";
import path from "path";

async function processLogo() {
  // Source candidates in priority order
  const candidates = [
    path.join(process.cwd(), "public/images/poll-city-logo.jpg"),
    path.join(process.cwd(), "public/images/poll-city-logo.png"),
    path.join(process.cwd(), "public/logo.png"),
  ];
  const input = candidates.find((p) => fs.existsSync(p));
  if (!input) {
    console.error("No source logo found. Tried:");
    candidates.forEach((p) => console.error("  " + p));
    process.exit(1);
  }
  console.log("Source:", input);

  fs.mkdirSync(path.join(process.cwd(), "public/images"), { recursive: true });
  const output = path.join(process.cwd(), "public/images/adoni-bubble.png");

  await sharp(input)
    .resize(200, 200, { fit: "cover", position: "centre" })
    .png({ quality: 100 })
    .toFile(output);

  const stats = fs.statSync(output);
  console.log(`Wrote ${output} (${stats.size} bytes, 200x200)`);
}

processLogo().catch((e) => {
  console.error(e);
  process.exit(1);
});
