/**
 * PWA icon generator.
 *
 * Generates every raster asset referenced by public/manifest.json and
 * src/app/layout.tsx from public/sf.webp using sharp:
 *
 *   - icon-192.png / icon-512.png / icon-1024.png        (manifest "any")
 *   - icon-192-maskable.png / icon-512-maskable.png /
 *     icon-1024-maskable.png                             (manifest "maskable")
 *   - apple-touch-icon.png (180×180)                     (iOS home screen icon)
 *   - apple-splash-<width>-<height>.png                  (iOS startup images)
 *
 * Falls back silently if sharp is unavailable — the generated PNGs are committed
 * to public/ and the SVG icons in manifest.json cover modern browsers, so the
 * build never depends on sharp being installed.
 *
 * Run manually with: node scripts/generate-pwa-icons.js
 */

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.info(
    "ℹ  sharp not available — skipping PNG icon generation.",
    "\n   The committed PNG icons and the SVG icons in manifest.json remain in use.",
    "\n   Install sharp (npm install -D sharp) to regenerate the PNG assets locally."
  );
  process.exit(0);
}

const fs = require("fs");
const path = require("path");

const SOURCE = path.join(__dirname, "..", "public", "sf.webp");
const OUT_DIR = path.join(__dirname, "..", "public");

/** Opaque backdrop for maskable / iOS assets; matches manifest background_color. */
const BACKGROUND = "#0a0f1e";

/** iOS home-screen icon size (iOS downsamples whatever it is given). */
const APPLE_TOUCH_ICON_SIZE = 180;

/** Manifest "any" icons — full-colour encode, unchanged from previous releases. */
const SIZES = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  { size: 1024, name: "icon-1024.png" },
];

/**
 * Maskable icons (Android adaptive icons). sf.webp keeps all of its artwork
 * inside the central 80% safe zone, so a centre-cropped resize on an opaque
 * background is never clipped by the platform mask.
 */
const MASKABLE_SIZES = [
  { size: 192, name: "icon-192-maskable.png" },
  { size: 512, name: "icon-512-maskable.png" },
  { size: 1024, name: "icon-1024-maskable.png" },
];

/**
 * iOS startup images — one file per device resolution. The matching media
 * queries live in APPLE_SPLASH_SCREENS in src/app/layout.tsx; keep both lists
 * in sync when adding a device.
 */
const SPLASH_SCREENS = [
  { width: 1290, height: 2796 },
  { width: 1179, height: 2556 },
  { width: 1284, height: 2778 },
  { width: 1170, height: 2532 },
  { width: 1125, height: 2436 },
  { width: 828, height: 1792 },
  { width: 750, height: 1334 },
  { width: 2048, height: 2732 },
  { width: 1668, height: 2388 },
  { width: 1536, height: 2048 },
];

/** Logo occupies 32% of the shorter splash edge, centred on the app background. */
const SPLASH_LOGO_RATIO = 0.32;

/**
 * Centre-cropped, opaque square raster of the source artwork.
 *
 * `quantise` re-encodes to a ≤256-colour palette. The artwork is a flat-background
 * logo, so quantisation costs well under 0.2/255 mean per-channel error while
 * roughly halving the payload of the larger splash screens and 1024px icons.
 */
function squarePng(size, { quantise = false } = {}) {
  const image = sharp(SOURCE)
    .resize(size, size, { fit: "cover", position: "center" })
    .flatten({ background: BACKGROUND });
  return quantise ? image.png({ palette: true }) : image.png();
}

const splashName = ({ width, height }) => `apple-splash-${width}-${height}.png`;

async function generate() {
  if (!fs.existsSync(SOURCE)) {
    console.warn("⚠  sf.webp not found at", SOURCE, "— skipping PNG icon generation.");
    return;
  }

  for (const { size, name } of SIZES) {
    await squarePng(size).toFile(path.join(OUT_DIR, name));
    console.log(`✓ Generated ${name} (${size}×${size})`);
  }

  for (const { size, name } of MASKABLE_SIZES) {
    await squarePng(size, { quantise: true }).toFile(path.join(OUT_DIR, name));
    console.log(`✓ Generated ${name} (${size}×${size}, maskable)`);
  }

  await squarePng(APPLE_TOUCH_ICON_SIZE, { quantise: true }).toFile(
    path.join(OUT_DIR, "apple-touch-icon.png")
  );
  console.log(
    `✓ Generated apple-touch-icon.png (${APPLE_TOUCH_ICON_SIZE}×${APPLE_TOUCH_ICON_SIZE})`
  );

  for (const screen of SPLASH_SCREENS) {
    const { width, height } = screen;
    const logoSize = Math.round(Math.min(width, height) * SPLASH_LOGO_RATIO);
    const logo = await squarePng(logoSize, { quantise: true }).toBuffer();
    const name = splashName(screen);
    await sharp({
      create: { width, height, channels: 4, background: BACKGROUND },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png({ palette: true })
      .toFile(path.join(OUT_DIR, name));
    console.log(`✓ Generated ${name} (${width}×${height})`);
  }
}

generate().catch((err) => {
  console.error("Failed to generate PWA icons:", err);
  process.exit(1);
});
