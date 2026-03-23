import { inngest } from "./client.js";
import { logger } from "../lib/logger.js";
import { runDailyAutomationCycle, runManualAutomation } from "../../jobs/automation.js";

export const dailyAutomationDigest = inngest.createFunction(
  { id: "daily-automation-digest", name: "Daily automation digest" },
  { cron: "0 8 * * *" },
  async ({ step }) => {
    return step.run("run-daily-cycle", async () => runDailyAutomationCycle("inngest-cron"));
  },
);

export const manualAutomationRun = inngest.createFunction(
  { id: "manual-automation-run", name: "Manual automation run" },
  { event: "automation/manual.run" },
  async ({ event, step }) => {
    const job = String(event.data.job ?? "daily");
    const text = String(event.data.text ?? "");

    return step.run("run-manual-job", async () => runManualAutomation(job, { text }));
  },
);

export const githubPushAutomation = inngest.createFunction(
  { id: "github-push-automation", name: "GitHub push automation" },
  { event: "automation/github.push" },
  async ({ event, step }) => {
    return step.run("log-push", async () => {
      logger.info("GitHub push event recibido", event.data);
      return {
        ok: true,
        source: "github-push",
        receivedAt: new Date().toISOString(),
        payload: event.data,
      };
    });
  },
);

export const telegramBroadcast = inngest.createFunction(
  { id: "telegram-broadcast", name: "Telegram broadcast" },
  { event: "automation/telegram.send" },
  async ({ event, step }) => {
    return step.run("send-telegram-message", async () =>
      runManualAutomation("telegram", { text: String(event.data.text ?? "Mensaje vacío") }),
    );
  },
);

export const functions = [
  dailyAutomationDigest,
  manualAutomationRun,
  githubPushAutomation,
  telegramBroadcast,
];
