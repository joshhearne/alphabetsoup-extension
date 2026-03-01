// Patches the built manifest.json for Firefox submission.
// Firefox requires browser_specific_settings.gecko.id
// and does not support service_worker in background — uses scripts array instead.

import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir   = resolve(__dirname, "../dist");

// Read built manifest
const manifestPath = resolve(distDir, "manifest.json");
const manifest     = JSON.parse(readFileSync(manifestPath, "utf8"));

// Add Firefox-specific fields
manifest.browser_specific_settings = {
  gecko: {
    id: "alphabetsoup@hearnetech.com",
    strict_min_version: "109.0",
  },
};

// Firefox MV3 uses background.scripts instead of service_worker
// (Firefox 109+ supports service_worker but older builds need this)
// Leave as-is for now — Firefox 109+ handles service_worker correctly.

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log("Firefox manifest patched.");
