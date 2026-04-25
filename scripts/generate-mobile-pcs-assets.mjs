/**
 * Generates mobile app icon and splash screen assets from the 2026 Poll City logos.
 * Handles both mobile-pcs (Social) and mobile (Campaign) apps.
 *
 * Run from repo root:  node scripts/generate-mobile-pcs-assets.mjs
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// New 2026 3D logos from Downloads
const SOCIAL_LOGO = 'C:/Users/14168/Downloads/Poll City Social Logo 2026 APP.png';
const CAMPAIGN_LOGO = 'C:/Users/14168/Downloads/Poll City Logo 2026.png';

const NAVY = { r: 10, g: 35, b: 66, alpha: 1 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function generateAssets(sourcePath, outputDir, appLabel) {
  console.log(`\n── ${appLabel} ──────────────────────────────────`);

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌  Source logo not found: ${sourcePath}`);
    process.exit(1);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const ICON_SIZE = 1024;

  // 1. APP ICON — logo scaled to fill 90% of 1024×1024 on white background
  //    (the new logos already have white bg; iOS adds rounded corners automatically)
  const logoForIcon = await sharp(sourcePath)
    .resize(Math.round(ICON_SIZE * 0.90), Math.round(ICON_SIZE * 0.90), {
      fit: 'contain',
      background: WHITE,
    })
    .toBuffer();

  await sharp({
    create: { width: ICON_SIZE, height: ICON_SIZE, channels: 4, background: WHITE },
  })
    .composite([{ input: logoForIcon, gravity: 'centre' }])
    .png()
    .toFile(path.join(outputDir, 'icon.png'));
  console.log('  ✅  icon.png (1024×1024, white bg)');

  // 2. ADAPTIVE ICON — logo on transparent foreground; backgroundColor set to white
  //    in app config so Android shapes look correct
  const logoForAdaptive = await sharp(sourcePath)
    .resize(Math.round(ICON_SIZE * 0.75), Math.round(ICON_SIZE * 0.75), {
      fit: 'contain',
      background: TRANSPARENT,
    })
    .toBuffer();

  await sharp({
    create: { width: ICON_SIZE, height: ICON_SIZE, channels: 4, background: TRANSPARENT },
  })
    .composite([{ input: logoForAdaptive, gravity: 'centre' }])
    .png()
    .toFile(path.join(outputDir, 'adaptive-icon.png'));
  console.log('  ✅  adaptive-icon.png (1024×1024, transparent bg)');

  // 3. SPLASH SCREEN — logo centred on navy, fills 55% of width
  const SPLASH_W = 1284;
  const SPLASH_H = 2778;
  const splashLogoSize = Math.round(SPLASH_W * 0.55);

  const logoForSplash = await sharp(sourcePath)
    .resize(splashLogoSize, splashLogoSize, { fit: 'contain', background: WHITE })
    .toBuffer();

  await sharp({
    create: { width: SPLASH_W, height: SPLASH_H, channels: 4, background: WHITE },
  })
    .composite([{ input: logoForSplash, gravity: 'centre' }])
    .png()
    .toFile(path.join(outputDir, 'splash.png'));
  console.log('  ✅  splash.png (1284×2778, white bg)');

  // 4. FAVICON — white bg, centered
  await sharp(sourcePath)
    .resize(192, 192, { fit: 'contain', background: WHITE })
    .png()
    .toFile(path.join(outputDir, 'favicon.png'));
  console.log('  ✅  favicon.png (192×192)');
}

async function run() {
  await generateAssets(
    SOCIAL_LOGO,
    path.join(ROOT, 'mobile-pcs', 'assets'),
    'Poll City Social (mobile-pcs)'
  );

  await generateAssets(
    CAMPAIGN_LOGO,
    path.join(ROOT, 'mobile', 'assets'),
    'Poll City Campaign (mobile)'
  );

  console.log('\n✅  All assets written for both apps.\n');
}

run().catch(err => {
  console.error('❌  Asset generation failed:', err.message);
  process.exit(1);
});
