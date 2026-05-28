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

const slides = html.match(/<section/g) || [];
if (slides.length !== 6) {
  fail(`Expected 6 reveal slides, found ${slides.length}`);
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
  "做时代的魔法师",
];

for (const snippet of requiredHtml) {
  if (!html.includes(snippet)) fail(`deck/index.html missing ${snippet}`);
}

const imageRefs = [...html.matchAll(/src="assets\/([^"]+)"/g)].map((match) => match[1]);
if (imageRefs.length < 8) {
  fail(`Expected at least 8 local deck asset references, found ${imageRefs.length}`);
}

for (const asset of imageRefs) {
  if (!/^\d{2}_[a-z0-9-]+\.(svg|png|jpg|jpeg|webp)$/.test(asset)) {
    fail(`Asset name should use numeric prefix and underscore: ${asset}`);
  }
  const assetPath = path.join(assetsDir, asset);
  if (!fs.existsSync(assetPath)) {
    fail(`Missing referenced asset ${path.relative(root, assetPath)}`);
  }
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
