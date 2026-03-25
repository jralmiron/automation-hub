import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { upsertGitHubSecret } from "../github/github-secrets.service.js";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

function getSetupToken() {
  return env.GOOGLE_SETUP_TOKEN || env.TELEGRAM_WEBHOOK_SECRET || "";
}

function getBaseUrl() {
  return env.APP_BASE_URL.replace(/\/$/, "");
}

function sign(value: string) {
  return createHmac("sha256", getSetupToken()).update(value).digest("hex");
}

function getAesKey() {
  return createHash("sha256").update(getSetupToken()).digest();
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getAesKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptSecret(value: string) {
  const buffer = Buffer.from(value, "base64url");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getAesKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function assertSetupAuthorized(token?: string) {
  if (!getSetupToken() || token !== getSetupToken()) {
    throw new Error("unauthorized");
  }
}

export function buildGoogleCallbackUrl() {
  return `${getBaseUrl()}/api/google/oauth/callback`;
}

export async function beginGoogleOAuthSetup(input: {
  clientId: string;
  clientSecret: string;
  calendarId?: string;
  timeZone?: string;
}) {
  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  const calendarId = (input.calendarId || "primary").trim();
  const timeZone = (input.timeZone || "Europe/Madrid").trim();

  if (!clientId || !clientSecret) {
    throw new Error("Faltan clientId o clientSecret");
  }

  await upsertGitHubSecret("GOOGLE_CLIENT_ID", clientId);
  await upsertGitHubSecret("GOOGLE_CLIENT_SECRET", clientSecret);
  await upsertGitHubSecret("GOOGLE_CALENDAR_ID", calendarId);
  await upsertGitHubSecret("GOOGLE_TIMEZONE", timeZone);

  const payload = JSON.stringify({
    clientId,
    clientSecret: encryptSecret(clientSecret),
    calendarId,
    timeZone,
    ts: Date.now(),
  });
  const state = Buffer.from(
    JSON.stringify({ payload, sig: sign(payload) }),
    "utf8",
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: buildGoogleCallbackUrl(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });

  return {
    ok: true as const,
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}

function parseState(state: string) {
  const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
    payload: string;
    sig: string;
  };

  if (decoded.sig !== sign(decoded.payload)) {
    throw new Error("state inválido");
  }

  const payload = JSON.parse(decoded.payload) as {
    clientId: string;
    clientSecret: string;
    calendarId: string;
    timeZone: string;
    ts: number;
  };

  if (Date.now() - payload.ts > 1000 * 60 * 20) {
    throw new Error("state expirado");
  }

  return {
    clientId: payload.clientId,
    clientSecret: decryptSecret(payload.clientSecret),
    calendarId: payload.calendarId,
    timeZone: payload.timeZone,
  };
}

export async function finishGoogleOAuthSetup(input: { code: string; state: string }) {
  const { clientId, clientSecret, calendarId, timeZone } = parseState(input.state);
  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: buildGoogleCallbackUrl(),
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json()) as {
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.refresh_token) {
    throw new Error(payload.error_description || payload.error || "No se recibió refresh token");
  }

  await upsertGitHubSecret("GOOGLE_CLIENT_ID", clientId);
  await upsertGitHubSecret("GOOGLE_CLIENT_SECRET", clientSecret);
  await upsertGitHubSecret("GOOGLE_REFRESH_TOKEN", payload.refresh_token);
  await upsertGitHubSecret("GOOGLE_CALENDAR_ID", calendarId);
  await upsertGitHubSecret("GOOGLE_TIMEZONE", timeZone);

  return { ok: true as const };
}

export function renderGoogleSetupHtml() {
  const token = getSetupToken();
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Google OAuth Setup</title></head>
<body style="font-family:Arial,sans-serif;max-width:700px;margin:40px auto;line-height:1.5">
  <h1>Conectar Google para automation-hub</h1>
  <p>Introduce el OAuth Client ID y Client Secret de Google Cloud. El sistema guardará los secrets en GitHub y te redirigirá para autorizar Gmail y Calendar.</p>
  <form id="setup-form">
    <label>Google Client ID<br><input name="clientId" style="width:100%" required></label><br><br>
    <label>Google Client Secret<br><input name="clientSecret" style="width:100%" required></label><br><br>
    <label>Calendar ID<br><input name="calendarId" value="primary" style="width:100%"></label><br><br>
    <label>Time zone<br><input name="timeZone" value="Europe/Madrid" style="width:100%"></label><br><br>
    <button type="submit">Conectar Google</button>
  </form>
  <p style="margin-top:24px;color:#555">Después del consentimiento, se guardará automáticamente el refresh token en GitHub Secrets.</p>
  <script>
    const form = document.getElementById('setup-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const response = await fetch('/api/google/oauth/setup?token=${encodeURIComponent(token)}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const text = await response.text();
        alert(text);
        return;
      }
      const payload = await response.json();
      window.location.href = payload.authUrl;
    });
  </script>
</body>
</html>`;
}

export function renderGoogleSetupSuccessHtml() {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Google conectado</title></head>
<body style="font-family:Arial,sans-serif;max-width:700px;margin:40px auto;line-height:1.5">
  <h1>Google conectado correctamente</h1>
  <p>Ya se ha guardado el refresh token en GitHub Secrets.</p>
  <p>Los flujos de Gmail y Google Calendar ya están listos para funcionar en GitHub Actions.</p>
</body></html>`;
}
