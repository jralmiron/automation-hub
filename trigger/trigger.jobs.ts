import { pingTriggerDev } from "./trigger.service.js";

export async function runTriggerHealthcheck() {
  return pingTriggerDev("automation-hub-healthcheck");
}
