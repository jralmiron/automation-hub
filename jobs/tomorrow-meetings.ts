import { runTomorrowMeetingsSummary } from "./automation.js";

const result = await runTomorrowMeetingsSummary("github-actions-evening");
console.log(JSON.stringify(result, null, 2));
