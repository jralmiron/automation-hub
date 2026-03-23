import { writeAutomationHeartbeat } from "./supabase.service.js";

export async function recordSupabaseHeartbeat(source: string) {
  return writeAutomationHeartbeat(source, {
    source,
    status: "ok",
    recordedAt: new Date().toISOString(),
  });
}
