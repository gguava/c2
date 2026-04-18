#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.parse
import asyncio
import websockets
import threading
from datetime import datetime
from http.server import HTTPServer

PORT = 8000
WS_PORT = 8001
LOG_FILE = "/tmp/worker_log.txt"

connected_clients = set()
log_lock = threading.Lock()


def log_print(msg, is_error=False):
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {msg}"
    prefix = "\033[91m" if is_error else ""
    suffix = "\033[0m" if is_error else ""
    print(f"{prefix}{log_entry}{suffix}")
    with open(LOG_FILE, "a") as f:
        f.write(log_entry + "\n")


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        log_print(f"{self.client_address[0]} GET {self.path}")

        if self.path.startswith("/log.html"):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            text = params.get("text", ["(no text)"])[0]
            log_print(f"  WORKER: {text}")
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"OK")
            return

        if self.path.startswith("/error"):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            msg = params.get("msg", ["(no msg)"])[0]
            log_print(f"  ERROR: {msg}", is_error=True)
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"OK")
            return

        if self.path.startswith("/ws"):
            log_print("WebSocket upgrade request received")
            self.send_response(400)
            self.end_headers()
            return

        return super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8", errors="ignore")
        log_print(f"{self.client_address[0]} POST {self.path} - {body[:200]}")
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(b"OK")

    def log_message(self, format, *args):
        pass


async def websocket_handler(websocket, path):
    log_print(f"WebSocket client connected from {websocket.remote_address}")
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type", "unknown")
                if msg_type == "log":
                    tag = data.get("tag", "")
                    msg_text = data.get("message", "")
                    log_print(f"  [{tag}] {msg_text}")
                elif msg_type == "stage":
                    stage = data.get("stage", "")
                    status = data.get("status", "")
                    percent = data.get("percent", 0)
                    is_error = data.get("isError", False)
                    log_print(
                        f"  STAGE [{stage}] {percent}%: {status}"
                        + (" [ERROR]" if is_error else "")
                    )
                elif msg_type == "error":
                    log_print(f"  ERROR: {data.get('message', '')}", is_error=True)
                elif msg_type == "complete":
                    log_print("  COMPLETE")
                elif msg_type == "exploit_result":
                    log_print(
                        f"  ★★★ EXPLOIT RESULT: Device={data.get('deviceModel', 'Unknown')} jscBase={data.get('jscBase', 'N/A')} info={data.get('info', 'N/A')} ★★★"
                    )
                else:
                    log_print(f"  WS: {msg_type}")
            except json.JSONDecodeError:
                log_print(f"  WS RAW: {message}")
    except websockets.exceptions.ConnectionClosed:
        log_print("WebSocket client disconnected")
    finally:
        connected_clients.discard(websocket)


async def ws_main():
    async with websockets.serve(websocket_handler, "0.0.0.0", WS_PORT):
        log_print(f"WebSocket server running on ws://0.0.0.0:{WS_PORT}")
        await asyncio.Future()


def run_websocket_server():
    asyncio.run(ws_main())


if __name__ == "__main__":
    open(LOG_FILE, "w").close()

    ws_thread = threading.Thread(target=run_websocket_server, daemon=True)
    ws_thread.start()

    log_print(f"HTTP server running on http://0.0.0.0:{PORT}")
    log_print(f"WebSocket server running on ws://0.0.0.0:{WS_PORT}")
    log_print(f"Logs saved to {LOG_FILE}")
    log_print("-" * 50)

    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        httpd.serve_forever()
