/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const archiver = require("archiver");

const target = process.argv[2];
if (!target || !["chrome", "firefox"].includes(target)) {
  throw new Error("Usage: node extension/build.js <chrome|firefox>");
}

const projectRoot = path.resolve(__dirname, "..");
const extensionRoot = path.resolve(projectRoot, "extension");
const distRoot = path.resolve(projectRoot, "dist");
const polyfillSrc = path.resolve(
  projectRoot,
  "node_modules",
  "webextension-polyfill",
  "dist",
  "browser-polyfill.js",
);
const polyfillDestDir = path.resolve(extensionRoot, "polyfill");
const polyfillDest = path.resolve(polyfillDestDir, "browser-polyfill.js");
const zipPath = path.resolve(distRoot, `whoosh-${target}.zip`);

function copyPolyfill() {
  if (!fs.existsSync(polyfillSrc)) {
    throw new Error("webextension-polyfill not found. Run npm install first.");
  }
  fs.mkdirSync(polyfillDestDir, { recursive: true });
  fs.copyFileSync(polyfillSrc, polyfillDest);
}

async function createZip() {
  fs.mkdirSync(distRoot, { recursive: true });

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    archive.glob("**/*", {
      cwd: extensionRoot,
      dot: true,
      ignore: ["build.js", "polyfill/.keep"],
    });
    archive.finalize();
  });
}

async function run() {
  copyPolyfill();
  await createZip();
  process.stdout.write(`Built ${zipPath}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
