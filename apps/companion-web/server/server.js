const fs = require("fs");
const http = require("http");
const path = require("path");
const { createApiHandlers } = require("../../../packages/energy-engine/api-handlers");

const releaseRoot = path.resolve(__dirname, "../../..");
const publicDir = path.resolve(__dirname, "../public");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const handleApi = createApiHandlers(releaseRoot);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const STATIC_ALLOWLIST = [
  {
    route: "/",
    filePath: path.join(publicDir, "index.html")
  },
  {
    route: "/index.html",
    filePath: path.join(publicDir, "index.html")
  },
  {
    route: "/prototype.html",
    filePath: path.join(publicDir, "index.html")
  },
  {
    route: "/enpal-smart-energy-companion-design-en.html",
    filePath: path.join(releaseRoot, "enpal-smart-energy-companion-design-en.html")
  },
  {
    routePrefix: "/assets/",
    directory: path.join(publicDir, "assets")
  },
  {
    routePrefix: "/docs/",
    directory: path.join(releaseRoot, "docs")
  }
];

function isInsideDirectory(directory, resolvedPath) {
  const relative = path.relative(directory, resolvedPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return true;
}

function resolveStaticPath(url) {
  const requestPath = decodeURIComponent(url.pathname);
  const exactMatch = STATIC_ALLOWLIST.find((entry) => entry.route === requestPath);
  if (exactMatch) return exactMatch.filePath;

  const prefixMatch = STATIC_ALLOWLIST.find((entry) => (
    entry.routePrefix && requestPath.startsWith(entry.routePrefix)
  ));
  if (!prefixMatch) return null;

  const relativePath = requestPath.slice(prefixMatch.routePrefix.length);
  const resolvedPath = path.resolve(prefixMatch.directory, relativePath);
  return isInsideDirectory(prefixMatch.directory, resolvedPath) ? resolvedPath : null;
}

function serveStatic(req, res, url) {
  const resolvedPath = resolveStaticPath(url);

  if (!resolvedPath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  fs.readFile(resolvedPath, (error, data) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(error.code === "ENOENT" ? "Not found" : "Unable to read file");
      return;
    }

    const contentType = CONTENT_TYPES[path.extname(resolvedPath)] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": contentType.startsWith("text/html") ? "no-store" : "public, max-age=60"
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

if (require.main === module) {
  server.listen(port, host, () => {
    console.log(`Enpal Smart Energy Companion running at http://${host}:${port}`);
  });
}

module.exports = {
  server
};
