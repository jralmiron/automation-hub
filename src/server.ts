import express from "express";
import { serve } from "inngest/express";
import { env } from "./config/env.js";
import { functions } from "./inngest/functions.js";
import { inngest } from "./inngest/client.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: env.INNGEST_APP_ID, time: new Date().toISOString() });
});

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  }),
);

app.listen(env.APP_PORT, () => {
  console.log(`automation-hub escuchando en ${env.APP_BASE_URL}`);
  console.log(`Inngest endpoint: ${env.APP_BASE_URL}/api/inngest`);
});
