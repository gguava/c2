import express, { type Request, type Response } from "express";
import pino from "pino";
import { ensureDirSync } from "./utils.ts";
import { handleStats } from "./routes/stats.ts";
import { handleUpload } from "./routes/upload.ts";

const logger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
    },
  },
});

const app = express();
const PORT = Number(Bun.env.PORT ?? 8882);
const DATA_DIR = Bun.env.DATA_DIR ?? "./data";

app.use(express.json({ type: "application/json" }));

app.use((req: Request, _res: Response, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    headers: { "user-agent": req.get("user-agent") },
  });
  next();
});

app.post("/stats", (req: Request, res: Response) =>
  handleStats(req, res, { logger, dataDir: DATA_DIR })
);

app.post("/upload", (req: Request, res: Response) =>
  handleUpload(req, res, { logger, dataDir: DATA_DIR })
);

ensureDirSync(DATA_DIR);

app.listen(PORT, () => {
  logger.info({ port: PORT, dataDir: DATA_DIR }, "C2 server started");
});
