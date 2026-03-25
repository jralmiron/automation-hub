import { buildBridgeStatus } from "../src/telegram-bridge/telegram-webhook.js";

export default async function handler(_req: any, res: any) {
  const status = await buildBridgeStatus();
  res.status(200).json(status);
}
