import {
  finishGoogleOAuthSetup,
  renderGoogleSetupSuccessHtml,
} from "../../../src/google/google-setup.service.js";

export default async function handler(req: any, res: any) {
  const code =
    typeof req.query?.code === "string"
      ? req.query.code
      : Array.isArray(req.query?.code)
        ? String(req.query.code[0] ?? "")
        : "";
  const state =
    typeof req.query?.state === "string"
      ? req.query.state
      : Array.isArray(req.query?.state)
        ? String(req.query.state[0] ?? "")
        : "";

  if (!code || !state) {
    res.status(400).send("missing code or state");
    return;
  }

  try {
    await finishGoogleOAuthSetup({ code, state });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(renderGoogleSetupSuccessHtml());
  } catch (error) {
    res
      .status(500)
      .send(`Google OAuth setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
