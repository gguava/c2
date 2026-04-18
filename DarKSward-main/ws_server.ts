import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";

const WS_PORT = 8001;
const LOG_FILE = "/tmp/worker_log.txt";

const connectedClients = new Set<WebSocket>();

function logPrint(msg: string, isError = false): void {
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const logEntry = `[${timestamp}] ${msg}`;
  const prefix = isError ? "\x1b[91m" : "";
  const suffix = isError ? "\x1b[0m" : "";
  console.log(`${prefix}${logEntry}${suffix}`);
  fs.appendFileSync(LOG_FILE, logEntry + "\n");
}

const wss = new WebSocketServer({ port: WS_PORT });

wss.on("connection", (ws: WebSocket) => {
  const remoteAddr = (ws as any)._socket?.remoteAddress || "unknown";
  logPrint(`WebSocket client connected from ${remoteAddr}`);
  connectedClients.add(ws);

  ws.on("message", (data: Buffer | string | ArrayBuffer | Buffer[]) => {
    try {
      const text = typeof data === "string" ? data : Buffer.isBuffer(data) ? data.toString() : String(data);
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
      const rawText = typeof data === "string" ? data : Buffer.isBuffer(data) ? data.toString() : String(data);
      logPrint(`  WS RAW: ${rawText}`);
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

logPrint(`WebSocket server running on ws://0.0.0.0:${WS_PORT}`);
logPrint("-".repeat(50));