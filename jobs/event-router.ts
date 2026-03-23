import { runDailyAutomationCycle } from "./automation.js";

const eventName = process.env.GITHUB_EVENT_NAME ?? "unknown";
const ref = process.env.GITHUB_REF ?? "";

const result = await runDailyAutomationCycle(`github-event:${eventName}:${ref}`);
console.log(JSON.stringify({ eventName, ref, result }, null, 2));
