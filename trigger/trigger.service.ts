import { env } from "../src/config/env.js";
import { redactSecrets } from "../src/lib/redact.js";
import type { TriggerHealthcheckResult } from "./trigger.types.js";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export async function pingTriggerDev(note: string): Promise<TriggerHealthcheckResult> {
  if (!env.TRIGGER_API_KEY) {
    return { ok: false, skipped: true, reason: "Falta TRIGGER_API_KEY" };
  }

  const response = await fetch(`${env.TRIGGER_API_URL}/api/v1/whoami`, {
    headers: {
      Authorization: `Bearer ${env.TRIGGER_API_KEY}`,
      Accept: "application/json",
      "x-automation-note": note,
    },
  });

  const text = await response.text();
  const safeText = redactSecrets(text);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: safeText.slice(0, 240),
    };
  }

  const payload = asObject(JSON.parse(text));
  const project = asObject(payload.project);
  const organization = asObject(payload.organization);

  return {
    ok: true,
    status: response.status,
    environment: {
      id: String(payload.id ?? ""),
      slug: String(payload.slug ?? ""),
      type: String(payload.type ?? ""),
      shortcode: payload.shortcode ? String(payload.shortcode) : null,
      paused: Boolean(payload.paused),
    },
    project: project.id
      ? {
          id: String(project.id ?? ""),
          slug: String(project.slug ?? ""),
          name: String(project.name ?? ""),
        }
      : undefined,
    organization: organization.id
      ? {
          id: String(organization.id ?? ""),
          slug: String(organization.slug ?? ""),
          title: String(organization.title ?? ""),
        }
      : undefined,
  };
}
