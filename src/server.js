const fs = require("fs");
const http = require("http");
const path = require("path");
const { createApiHandlers } = require("./lib/api-handlers");

const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const handleApi = createApiHandlers(rootDir);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml"
};

const STATIC_ALLOWLIST = [
  "prototype.html",
  "enpal-smart-energy-companion-design.html",
  "ENGINEERING_ALIGNMENT.md",
  "requirement.md",
  "data",
  "docs"
];

function isAllowedStaticPath(resolvedPath) {
  const relative = path.relative(rootDir, resolvedPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return STATIC_ALLOWLIST.some((entry) => relative === entry || relative.startsWith(`${entry}${path.sep}`));
}

function serveStatic(req, res, url) {
  const requestPath = url.pathname === "/" ? "/prototype.html" : decodeURIComponent(url.pathname);
  const resolvedPath = path.resolve(rootDir, `.${requestPath}`);

  if (!isAllowedStaticPath(resolvedPath)) {
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
