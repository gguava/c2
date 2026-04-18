import http from "http";
import { WebSocketServer } from "ws";
import fs from "fs";
import url from "url";
import path from "path";

const PORT = 8000;
const WS_PORT = 8001;
const LOG_FILE = "/tmp/worker_log.txt";

const connectedClients = new Set<import("ws").WebSocket>();

function logPrint(msg: string, isError = false): void {
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const logEntry = `[${timestamp}] ${msg}`;
  const prefix = isError ? "\x1b[91m" : "";
  const suffix = isError ? "\x1b[0m" : "";
  console.log(`${prefix}${logEntry}${suffix}`);
  fs.appendFileSync(LOG_FILE, logEntry + "\n");
}

const httpServer = http.createServer((req, res) => {
  const clientIp = req.socket.remoteAddress || "unknown";
  const parsedUrl = url.parse(req.url || "", true);

  if (req.method === "GET") {
    logPrint(`${clientIp} GET ${parsedUrl.pathname}`);

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

const wss = new WebSocketServer({ port: WS_PORT });

wss.on("connection", (ws) => {
  const remoteAddr = ws.socket.remoteAddress;
  logPrint(`WebSocket client connected from ${remoteAddr}`);
  connectedClients.add(ws);

  ws.on("message", (data) => {
    try {
      const text = data.toString();
      const jsonData = JSON.parse(text);
      const msgType = (jsonData.type as string) || "unknown";

      if (msgType === "log") {
        const tag = (jsonData.tag as string) || "";
        const message = (jsonData.message as string) || "";
        logPrint(`  [${tag}] ${message}`);
      } else if (msgType === "stage") {
        const stage = (jsonData.stage as string) || "";
        const status = (jsonData.status as string) || "";
        const percent = jsonData.percent as number;
        const isError = jsonData.isError as boolean;
        logPrint(`  STAGE [${stage}] ${percent}%: ${status}${isError ? " [ERROR]" : ""}`);
      } else if (msgType === "error") {
        logPrint(`  ERROR: ${jsonData.message || ""}`, true);
      } else if (msgType === "complete") {
        logPrint("  COMPLETE");
      } else if (msgType === "exploit_result") {
        logPrint(
          `  ★★★ EXPLOIT RESULT: Device=${jsonData.deviceModel || "Unknown"} jscBase=${jsonData.jscBase || "N/A"} info=${jsonData.info || "N/A"} ★★★`
        );
      } else {
        logPrint(`  WS: ${msgType}`);
      }
    } catch {
      logPrint(`  WS RAW: ${data.toString()}`);
    }
  });

  ws.on("close", () => {
    logPrint("WebSocket client disconnected");
    connectedClients.delete(ws);
  });

  ws.on("error", () => {
    connectedClients.delete(ws);
  });
});

fs.writeFileSync(LOG_FILE, "");

logPrint(`HTTP server running on http://0.0.0.0:${PORT}`);
logPrint(`WebSocket server running on ws://0.0.0.0:${WS_PORT}`);
logPrint(`Logs saved to ${LOG_FILE}`);
logPrint("-".repeat(50));

httpServer.listen(PORT, "0.0.0.0");