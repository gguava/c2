import http from "http";
import fs from "fs";
import url from "url";

const PORT = 8001;
const STATS_DIR = "/tmp/stats";

// Create stats directory if not exists
if (!fs.existsSync(STATS_DIR)) {
  fs.mkdirSync(STATS_DIR, { recursive: true });
}

function logPrint(msg: string, isError = false): void {
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const prefix = isError ? "\x1b[91m" : "";
  const suffix = isError ? "\x1b[0m" : "";
  console.log(`${prefix}[${timestamp}] ${msg}${suffix}`);
}

const httpServer = http.createServer((req, res) => {
  const clientIp = req.socket.remoteAddress || "unknown";
  const parsedUrl = url.parse(req.url || "", true);

  if (req.method === "POST" && parsedUrl.pathname === "/stats") {
    const deviceUUID = req.headers["x-device-uuid"] || "unknown";
    let body: Buffer[] = [];

    req.on("data", (chunk: Buffer) => {
      body.push(chunk);
    });

    req.on("end", () => {
      const data = Buffer.concat(body);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${STATS_DIR}/${deviceUUID}_${timestamp}.json`;

      try {
        fs.writeFileSync(filename, data);
        logPrint(`${clientIp} POST /stats - ${data.length} bytes saved to ${filename}`);

        // Try to parse and show preview
        try {
          const json = JSON.parse(data.toString());
          const preview = JSON.stringify(json).slice(0, 200);
          logPrint(`  Data preview: ${preview}...`);
        } catch {
          logPrint(`  Data is not valid JSON, saved as raw data`);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", saved: filename }));
      } catch (err) {
        logPrint(`  Failed to save: ${err}`, true);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", message: String(err) }));
      }
    });
    return;
  }

  // Other requests
  logPrint(`${clientIp} ${req.method} ${parsedUrl.pathname} - 404`);
  res.writeHead(404);
  res.end("Not Found");
});

logPrint(`Stats server running on http://0.0.0.0:${PORT}`);
logPrint(`Data saved to ${STATS_DIR}/`);
logPrint("-".repeat(50));

httpServer.listen(PORT, "0.0.0.0", () => {
  logPrint("Ready to receive stats data");
});
