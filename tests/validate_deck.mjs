import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rootIndexPath = path.join(root, "index.html");
const deckDir = path.join(root, "deck");
const indexPath = path.join(deckDir, "index.html");
const stylesPath = path.join(deckDir, "styles.css");
const assetsDir = path.join(deckDir, "assets");
const vendorDir = path.join(deckDir, "vendor", "reveal");

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};

const read = (filePath) => {
  if (!fs.existsSync(filePath)) {
    fail(`Missing ${path.relative(root, filePath)}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
};

const html = read(indexPath);
const css = read(stylesPath);
const rootHtml = read(rootIndexPath);

for (const legacyPath of [
  "claude_deck",
  "docs",
  "exports",
  "presentation",
  "reveal.js",
  "scripts",
  path.join("tests", "validate_presentation.mjs"),
]) {
  if (fs.existsSync(path.join(root, legacyPath))) {
    fail(`Legacy path should be removed: ${legacyPath}`);
  }
}

for (const snippet of ["deck/", "AI时代的感受力与良质"]) {
  if (!rootHtml.includes(snippet)) fail(`index.html missing ${snippet}`);
}

for (const filePath of [
  path.join(vendorDir, "reset.css"),
  path.join(vendorDir, "reveal.css"),
  path.join(vendorDir, "reveal.js"),
]) {
  if (!fs.existsSync(filePath)) fail(`Missing ${path.relative(root, filePath)}`);
}

if (!fs.existsSync(assetsDir)) {
  fail("Missing deck/assets");
}

for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!/\.(svg|png|jpe?g|webp)$/i.test(entry.name)) continue;
  if (entry.name === "page1.png") continue;
  if (!/^\d{2}_/.test(entry.name)) {
    fail(`Root deck asset should start with a slide number prefix: ${entry.name}`);
  }
}

const slides = html.match(/<section/g) || [];
if (slides.length !== 8) {
  fail(`Expected 8 reveal slides, found ${slides.length}`);
}

const requiredHtml = [
  'href="vendor/reveal/reset.css"',
  'href="vendor/reveal/reveal.css"',
  'href="styles.css"',
  'src="vendor/reveal/reveal.js"',
  "Reveal.initialize",
  "fragment",
  "data-fragment-index",
  "AI时代的感受力与良质",
  "效率之外，重建人与世界的真实连接",
  "Thank you for listening!",
];

for (const snippet of requiredHtml) {
  if (!html.includes(snippet)) fail(`deck/index.html missing ${snippet}`);
}

const imageRefs = [...html.matchAll(/src="assets\/([^"]+)"/g)].map((match) => match[1]);
if (imageRefs.length < 8) {
  fail(`Expected at least 8 local deck asset references, found ${imageRefs.length}`);
}

const slideHtml = [...html.matchAll(/<section\b[\s\S]*?<\/section>/g)].map((match) => match[0]);
const allowedAssetPatternsBySlide = [
  [],
  ["01_", "02_sunyat.png", "02_yale.png", "02_bytedance.jpg", "02_shopee.jpg"],
  ["02_"],
  ["03_"],
  ["04_"],
  ["05_"],
  ["06_"],
  [],
];
for (const [index, slide] of slideHtml.entries()) {
  const allowedPatterns = allowedAssetPatternsBySlide[index];
  if (!allowedPatterns?.length) continue;
  const slideImageRefs = [...slide.matchAll(/src="assets\/([^"]+)"/g)].map((match) => match[1]);
  for (const asset of slideImageRefs) {
    const isAllowed = allowedPatterns.some((pattern) =>
      pattern.endsWith("_") ? asset.startsWith(pattern) : asset === pattern,
    );
    if (!isAllowed) {
      fail(`Slide ${index + 1} asset is not allowed by slide asset rules: ${asset}`);
    }
  }
}

for (const asset of imageRefs) {
  if (!/\.(svg|png|jpe?g|webp)$/i.test(asset)) {
    fail(`Unsupported image asset extension: ${asset}`);
  }
  const assetPath = path.join(assetsDir, asset);
  if (!fs.existsSync(assetPath)) {
    fail(`Missing referenced asset ${path.relative(root, assetPath)}`);
  }
}

for (const asset of ["01_personal-photo.JPG", "02_running-robot.jpg", "02_codex-keypad.jpg", "05_meme.jpg", "03_campervan.jpg", "04_book.jpg"]) {
  if (!imageRefs.includes(asset)) fail(`deck/index.html should reference ${asset}`);
}

const remoteRefs = [
  "https://cdnjs",
  "https://via.placeholder",
  "https://upload.wikimedia",
];

for (const snippet of remoteRefs) {
  if (html.includes(snippet)) fail(`deck/index.html should not depend on ${snippet}`);
}

const requiredCss = [
  "#2961db",
  ".reveal .slides section",
  ".slide-shell",
  ".fragment",
  "@media print",
];

for (const snippet of requiredCss) {
  if (!css.includes(snippet)) fail(`deck/styles.css missing ${snippet}`);
}

if (!process.exitCode) {
  console.log("Reveal deck validation passed.");
}
