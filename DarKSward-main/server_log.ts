import http from "http";
import fs from "fs";
import url from "url";
import path from "path";

const PORT = 8000;
const LOG_FILE = "/tmp/worker_log.txt";

function logPrint(msg: string, isError = false): void {
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const logEntry = `[${timestamp}] ${msg}`;
  const prefix = isError ? "\x1b[91m" : "";
  const suffix = isError ? "\x1b[0m" : "";
  console.log(`${prefix}${logEntry}${suffix}`);
  fs.appendFileSync(LOG_FILE, logEntry + "\n");
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const httpServer = http.createServer((req, res) => {
  const clientIp = req.socket.remoteAddress || "unknown";
  const parsedUrl = url.parse(req.url || "", true);
  const host = req.headers.host || `localhost:${PORT}`;
  const serverHost = host.includes(':') ? host : `${host}:${PORT}`;

  if (req.method === "GET") {
    logPrint(`${clientIp} GET ${parsedUrl.pathname}`);

    if (parsedUrl.pathname === "/log") {
      const tag = (parsedUrl.query.tag as string) || "";
      const msg = (parsedUrl.query.msg as string) || "";
      if (tag === "WORKER") {
        logPrint(`  [WORKER] ${msg}`);
      } else if (tag) {
        logPrint(`  [${tag}] ${msg}`);
      } else {
        logPrint(`  ${msg}`);
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("OK");
      return;
    }

    if (parsedUrl.pathname === "/log.html") {
      const text = (parsedUrl.query.text as string) || "(no text)";
      logPrint(`  WORKER: ${text}`);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("OK");
      return;
    }

    if (parsedUrl.pathname === "/error") {
      const msg = (parsedUrl.query.msg as string) || "(no msg)";
      logPrint(`  ERROR: ${msg}`, true);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("OK");
      return;
    }

    if (parsedUrl.pathname === "/ws") {
      logPrint("WebSocket upgrade request received");
      res.writeHead(400);
      res.end();
      return;
    }

    if (parsedUrl.pathname === "/stage") {
      const stage = (parsedUrl.query.stage as string) || "";
      const status = (parsedUrl.query.status as string) || "";
      const percent = parseInt(parsedUrl.query.percent as string) || 0;
      const isError = parsedUrl.query.isError === '1';
      logPrint(`  STAGE [${stage}] ${percent}%: ${status}${isError ? " [ERROR]" : ""}`);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("OK");
      return;
    }

    if (parsedUrl.pathname === "/complete") {
      logPrint("  COMPLETE");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("OK");
      return;
    }

    let filePath = parsedUrl.pathname === "/" ? "/index.html" : parsedUrl.pathname || "/index.html";
    const fullPath = path.join(process.cwd(), filePath);
    const ext = path.extname(fullPath);
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    try {
      const content = fs.readFileSync(fullPath);
      res.writeHead(200, {
        "Content-Type": mimeType,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      });
      res.end(content);
      return;
    } catch {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      logPrint(`${clientIp} POST ${parsedUrl.pathname} - ${body.slice(0, 200)}`);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("OK");
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

fs.writeFileSync(LOG_FILE, "");

logPrint(`HTTP server running on http://0.0.0.0:${PORT}`);
logPrint(`Logs saved to ${LOG_FILE}`);
logPrint("-".repeat(50));

httpServer.listen(PORT, "0.0.0.0", () => {
  logPrint(`Ready - request Host header determines server address`);
});