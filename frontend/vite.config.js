import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// Photos can be kept in  <project>/images  (next to the frontend and backend folders)
// or in  frontend/public/images . Both are available on the website as  /images/<file> .
const IMAGE_DIRS = [path.resolve(here, "../images"), path.resolve(here, "public/images")];
const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" };

function localImages() {
  return {
    name: "local-images",
    // Development server: serve /images/<file> from the folders above.
    configureServer(server) {
      server.middlewares.use("/images", (req, res, next) => {
        const name = decodeURIComponent((req.url || "").split("?")[0]).replace(/^\/+/, "");
        const type = TYPES[path.extname(name).toLowerCase()];
        if (!type || name.includes("..")) return next();
        for (const dir of IMAGE_DIRS) {
          const file = path.join(dir, name);
          if (file.startsWith(dir) && fs.existsSync(file) && fs.statSync(file).isFile()) {
            res.setHeader("Content-Type", type);
            return fs.createReadStream(file).pipe(res);
          }
        }
        next();
      });
    },
    // Production build: copy the photos into dist/images.
    closeBundle() {
      const out = path.resolve(here, "dist/images");
      for (const dir of IMAGE_DIRS) {
        if (!fs.existsSync(dir) || dir.endsWith(path.join("public", "images"))) continue; // public/ is copied by Vite itself
        fs.mkdirSync(out, { recursive: true });
        for (const f of fs.readdirSync(dir)) if (TYPES[path.extname(f).toLowerCase()]) fs.copyFileSync(path.join(dir, f), path.join(out, f));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), localImages()],
});
