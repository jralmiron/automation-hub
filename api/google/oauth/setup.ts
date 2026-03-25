import {
  assertSetupAuthorized,
  beginGoogleOAuthSetup,
  renderGoogleSetupHtml,
} from "../../../src/google/google-setup.service.js";

function getToken(req: any) {
  const raw = req.query?.token;
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw)) {
    return String(raw[0] ?? "");
  }
  return "";
}

export default async function handler(req: any, res: any) {
  try {
    assertSetupAuthorized(getToken(req));
  } catch {
    res.status(401).send("unauthorized");
    return;
  }

  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(renderGoogleSetupHtml());
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method-not-allowed" });
    return;
  }

  const input = {
    clientId: String(req.body?.clientId ?? ""),
    clientSecret: String(req.body?.clientSecret ?? ""),
    calendarId: String(req.body?.calendarId ?? "primary"),
    timeZone: String(req.body?.timeZone ?? "Europe/Madrid"),
  };

  const result = await beginGoogleOAuthSetup(input);
  res.status(200).json(result);
}
