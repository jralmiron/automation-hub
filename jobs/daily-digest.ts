import { runDailyAutomationCycle } from "./automation.js";

const result = await runDailyAutomationCycle("github-actions-daily");
console.log(JSON.stringify(result, null, 2));
