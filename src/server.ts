import express from "express";
import { env } from "./config/env.js";
import { handleTelegramWebhookRequest, buildBridgeStatus } from "./telegram-bridge/telegram-webhook.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: "automation-hub", time: new Date().toISOString() });
});

app.get("/trigger/health", (_req, res) => {
  res.json({ ok: true, provider: "trigger.dev", mode: "github-actions + trigger.dev" });
});

app.get("/telegram/health", async (_req, res) => {
  const status = await buildBridgeStatus();
  res.json(status);
});

app.post("/telegram/webhook", async (req, res) => {
  const secretHeader =
    req.header("x-telegram-bot-api-secret-token")?.trim() ||
    (typeof req.query.secret === "string" ? req.query.secret.trim() : undefined);
  const result = await handleTelegramWebhookRequest({
    body: req.body,
    secretHeader,
  });

  res.status(result.status).json(result.body);
});

app.listen(env.APP_PORT, () => {
  console.log(`automation-hub escuchando en ${env.APP_BASE_URL}`);
  console.log(`Trigger health endpoint: ${env.APP_BASE_URL}/trigger/health`);
  console.log(`Telegram health endpoint: ${env.APP_BASE_URL}/telegram/health`);
});
