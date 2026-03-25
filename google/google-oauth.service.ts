import { env } from "../src/config/env.js";

const REQUIRED_GOOGLE_ENV = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
] as const;

export function getGoogleMissingEnv() {
  return REQUIRED_GOOGLE_ENV.filter((key) => !env[key]);
}

export function hasGoogleOAuthConfigured() {
  return getGoogleMissingEnv().length === 0;
}

export async function getGoogleAccessToken() {
  const missing = getGoogleMissingEnv();
  if (missing.length > 0) {
    throw new Error(`Faltan credenciales Google OAuth: ${missing.join(", ")}`);
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? "",
    client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: env.GOOGLE_REFRESH_TOKEN ?? "",
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(
      `No se pudo renovar el token de Google${payload.error ? `: ${payload.error}` : ""}`,
    );
  }

  return payload.access_token;
}
