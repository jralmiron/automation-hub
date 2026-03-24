import express from "express";
import { env } from "./config/env.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: "automation-hub", time: new Date().toISOString() });
});

app.get("/trigger/health", (_req, res) => {
  res.json({ ok: true, provider: "trigger.dev", mode: "github-actions + trigger.dev" });
});

app.listen(env.APP_PORT, () => {
  console.log(`automation-hub escuchando en ${env.APP_BASE_URL}`);
  console.log(`Trigger health endpoint: ${env.APP_BASE_URL}/trigger/health`);
});
