// out/ を配信する最小の静的サーバー（依存なし・ネットワーク不要）。
// trailingSlash: true で書き出したサイトに合わせ、/path/ → /path/index.html を返す。
// 使い方: node e2e/serve.mjs [port] [dir]
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.argv[3] || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out"));
const port = Number(process.argv[2] || 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".md": "text/markdown; charset=utf-8",
};

async function resolveFile(urlPath) {
  const rel = decodeURIComponent(urlPath.split("?")[0]);
  const target = path.normalize(path.join(root, rel));
  if (!target.startsWith(root)) return null;
  for (const candidate of [target, path.join(target, "index.html"), `${target}.html`]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

http
  .createServer(async (req, res) => {
    const file = await resolveFile(req.url || "/");
    if (!file) {
      const nf = await resolveFile("/404.html");
      res.writeHead(404, { "content-type": TYPES[".html"] });
      res.end(nf ? await readFile(nf) : "Not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  })
  .listen(port, "127.0.0.1", () => console.log(`serving ${root} at http://127.0.0.1:${port}`));
